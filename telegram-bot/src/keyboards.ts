import { InlineKeyboard, Keyboard } from "grammy";
import { githubUrl } from "./config.js";

export function mainKeyboard(isAdmin = false): Keyboard {
  const keyboard = new Keyboard()
    .text("💬 Задать вопрос")
    .text("👤 Профиль")
    .row()
    .text("🎟️ Ввести промокод")
    .text("💎 Купить запросы")
    .row()
    .text("🤝 Заработать алмазы")
    .text("🔗 GitHub проекта");

  if (isAdmin) keyboard.row().text("🛠️ Админ-панель");
  return keyboard.resized().persistent();
}

export const githubKeyboard = new InlineKeyboard().url("🔗 Открыть репозиторий", githubUrl);

export function askKeyboard(): Keyboard {
  return new Keyboard()
    .text("🎨 Сгенерировать изображение")
    .row()
    .text("↩️ Назад")
    .resized()
    .persistent();
}

export function shopKeyboard(): Keyboard {
  return new Keyboard()
    .text("5 запросов — 100 ♦")
    .text("10 запросов — 300 ♦")
    .row()
    .text("20 запросов — 400 ♦")
    .text("100 запросов — 1500 ♦")
    .row()
    .text("∞ запросов — 50 000 ♦")
    .row()
    .text("↩️ Назад")
    .resized()
    .persistent();
}

export function adminKeyboard(): Keyboard {
  return new Keyboard()
    .text("🧾 Создать промокод")
    .row()
    .text("🎁 Выдать запросы")
    .row()
    .text("👑 Выдать админ-панель")
    .row()
    .text("↩️ Назад")
    .resized()
    .persistent();
}