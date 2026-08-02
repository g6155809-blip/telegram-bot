import { config, usesReplitAiIntegration } from "./config.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function aiBaseUrl(): string {
  return usesReplitAiIntegration
    ? config.AI_INTEGRATIONS_OPENAI_BASE_URL!.trim()
    : config.OPENAI_BASE_URL.trim();
}

function aiKey(): string {
  return usesReplitAiIntegration
    ? config.AI_INTEGRATIONS_OPENAI_API_KEY!.trim()
    : config.OPENAI_API_KEY?.trim() || "";
}

function configuredChatModel(): string | undefined {
  const configured = config.OPENAI_CHAT_MODEL.trim();
  return configured && configured.toLowerCase() !== "auto" ? configured : undefined;
}

function isGpt5Model(model: string): boolean {
  return /^(gpt-5|o[134])/.test(model);
}

function modelCandidates(): string[] {
  const configured = configuredChatModel();
  const defaults = usesReplitAiIntegration
    ? ["gpt-5.6-terra"]
    : ["gpt-4o-mini", "gpt-4.1-mini"];
  const candidates = configured ? [configured, ...defaults] : defaults;
  return [...new Set(candidates)];
}

function shouldRetryStatus(status: number): boolean {
  return [408, 409, 429, 500, 502, 503, 504].includes(status);
}

async function aiFetch(
  pathname: string,
  body: unknown,
  options: { retryModel?: boolean } = {},
): Promise<Response> {
  const url = `${aiBaseUrl().replace(/\/$/, "")}${pathname}`;
  const maxAttempts = 3;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiKey()}`,
        },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify(body),
      });
      if (response.ok || !shouldRetryStatus(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }

  if (!options.retryModel && lastResponse) return lastResponse;
  return lastResponse!;
}

async function describeApiError(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  const compact = body.replace(/\s+/g, " ").trim().slice(0, 500);
  return compact
    ? `AI request failed with status ${response.status}: ${compact}`
    : `AI request failed with status ${response.status}`;
}

export async function answerQuestion(question: string, userName: string): Promise<string> {
  let lastError = "AI returned an empty answer";
  const messages = [
    {
      role: "system" as const,
      content:
        "Ты профессиональный русскоязычный AI-помощник. Отвечай точно, понятно и структурированно. Если вопрос зависит от актуальных данных, честно укажи ограничение. Не помогай с вредоносными, мошенническими, спамными или незаконными действиями.",
    },
    {
      role: "user" as const,
      content: `Пользователь ${userName} спрашивает: ${question}`,
    },
  ] satisfies ChatMessage[];

  for (const model of modelCandidates()) {
    const tokenLimit = isGpt5Model(model)
      ? { max_completion_tokens: 8192 }
      : { max_tokens: 8192 };
    const response = await aiFetch(
      "/chat/completions",
      { model, ...tokenLimit, messages },
      { retryModel: true },
    );

    if (!response.ok) {
      lastError = await describeApiError(response);
      // A 400/404 commonly means an unavailable model or unsupported
      // parameter. Try the next provider-compatible model.
      if ([400, 404].includes(response.status)) continue;
      throw new Error(
        `${lastError} (provider: ${usesReplitAiIntegration ? "Replit AI" : "OpenAI"})`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (answer) return answer;
    lastError = `AI returned an empty answer for model ${model}`;
  }

  throw new Error(
    `${lastError} (provider: ${usesReplitAiIntegration ? "Replit AI" : "OpenAI"})`,
  );
}

export async function generateImage(prompt: string): Promise<Buffer> {
  const response = await aiFetch("/images/generations", {
    model: config.OPENAI_IMAGE_MODEL,
    prompt,
    size: "1024x1024",
    n: 1,
  });
  if (!response.ok) throw new Error(await describeApiError(response));
  const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const image = data.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) return Buffer.from(await (await fetch(image.url)).arrayBuffer());
  throw new Error("Image generation returned no image");
}