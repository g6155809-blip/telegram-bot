import { config, usesReplitAiIntegration } from "./config.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function aiBaseUrl(): string {
  return usesReplitAiIntegration
    ? config.AI_INTEGRATIONS_OPENAI_BASE_URL!
    : config.OPENAI_BASE_URL;
}

function aiKey(): string {
  return usesReplitAiIntegration
    ? config.AI_INTEGRATIONS_OPENAI_API_KEY!
    : config.OPENAI_API_KEY || "";
}

function chatModel(): string {
  const configured = config.OPENAI_CHAT_MODEL.trim();
  // gpt-5.6-terra is available through Replit's proxy, not a regular
  // OpenAI API key. Avoid carrying that setting into a Railway deployment.
  if (!usesReplitAiIntegration && configured.startsWith("gpt-5.6")) {
    return "gpt-4o-mini";
  }
  return configured;
}

function isGpt5Model(model: string): boolean {
  return /^gpt-5|^o[134]/.test(model);
}

async function aiFetch(pathname: string, body: unknown): Promise<Response> {
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
      if (response.ok || ![408, 409, 429, 500, 502, 503, 504].includes(response.status)) {
        return response;
      }
      lastResponse = response;
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }

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
  const model = chatModel();
  const tokenLimit = isGpt5Model(model)
    ? { max_completion_tokens: 8192 }
    : { max_tokens: 8192 };
  const response = await aiFetch("/chat/completions", {
    model,
    ...tokenLimit,
    messages: [
      {
        role: "system",
        content:
          "Ты профессиональный русскоязычный AI-помощник. Отвечай точно, понятно и структурированно. Если вопрос зависит от актуальных данных, честно укажи ограничение. Не помогай с вредоносными, мошенническими, спамными или незаконными действиями.",
      },
      {
        role: "user",
        content: `Пользователь ${userName} спрашивает: ${question}`,
      },
    ] satisfies ChatMessage[],
  });
  if (!response.ok) {
    const error = await describeApiError(response);
    throw new Error(`${error} (provider: ${usesReplitAiIntegration ? "Replit AI" : "OpenAI"})`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("AI returned an empty answer");
  return answer;
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