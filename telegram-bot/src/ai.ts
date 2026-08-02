import { config } from "./config.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function aiBaseUrl(): string {
  return config.AI_INTEGRATIONS_OPENAI_BASE_URL || config.OPENAI_BASE_URL;
}

function aiKey(): string {
  return config.AI_INTEGRATIONS_OPENAI_API_KEY || config.OPENAI_API_KEY || "";
}

async function aiFetch(pathname: string, body: unknown): Promise<Response> {
  return fetch(`${aiBaseUrl().replace(/\/$/, "")}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiKey()}`,
    },
    body: JSON.stringify(body),
  });
}

export async function answerQuestion(question: string, userName: string): Promise<string> {
  const response = await aiFetch("/chat/completions", {
    model: config.OPENAI_CHAT_MODEL,
    max_completion_tokens: 8192,
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
  if (!response.ok) throw new Error(`AI request failed with status ${response.status}`);
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
  if (!response.ok) throw new Error(`Image generation failed with status ${response.status}`);
  const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const image = data.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, "base64");
  if (image?.url) return Buffer.from(await (await fetch(image.url)).arrayBuffer());
  throw new Error("Image generation returned no image");
}