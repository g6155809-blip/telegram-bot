import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  ADMIN_TELEGRAM_ID: z.coerce
    .number()
    .int()
    .positive("ADMIN_TELEGRAM_ID must be a positive integer"),
  AI_INTEGRATIONS_OPENAI_BASE_URL: z.string().url().optional().or(z.literal("")),
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-5.6-terra"),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-1"),
  DATA_FILE: z.string().default("./data/bot-state.json"),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.message).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (!parsed.data.AI_INTEGRATIONS_OPENAI_API_KEY && !parsed.data.OPENAI_API_KEY) {
  throw new Error(
    "Configure Replit AI Integration (AI_INTEGRATIONS_OPENAI_API_KEY) or OPENAI_API_KEY.",
  );
}

export const config = parsed.data;
export const ownerId = config.ADMIN_TELEGRAM_ID;
export const githubUrl = "https://github.com/g6155809-blip/telegram-bot";

export function normalizeUsername(username?: string): string | undefined {
  return username?.replace(/^@/, "").trim().toLowerCase() || undefined;
}