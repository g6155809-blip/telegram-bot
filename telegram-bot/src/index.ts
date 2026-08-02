import { config } from "./config.js";
import { createBot } from "./bot.js";
import { loadState } from "./storage.js";

await loadState();
const bot = createBot();

await bot.api.setMyCommands([
  { command: "start", description: "Открыть главное меню" },
  { command: "profile", description: "Показать профиль" },
  { command: "admin", description: "Открыть админ-панель" },
]);

console.info("Telegram AI bot is starting");
await bot.start({
  onStart: (info) => console.info(`Bot @${info.username} is running`),
});

function shutdown(signal: string): void {
  console.info(`Received ${signal}, stopping bot`);
  bot.stop();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

void config;