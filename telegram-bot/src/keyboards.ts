import { Keyboard } from "grammy";

export const mainKeyboard = new Keyboard()
  .text("Задать вопрос")
  .text("Профиль")
  .row()
  .text("Ввести промокод")
  .text("Купить запросы")
  .row()
  .text("Заработать алмазы")
  .row()
  .text("Админ-панель")
  .resized()
  .persistent();

export function askKeyboard(): Keyboard {
  return new Keyboard()
    .text("Сгенерировать изображение")
    .row()
    .text("Назад")
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
    .text("Назад")
    .resized()
    .persistent();
}

export function adminKeyboard(): Keyboard {
  return new Keyboard()
    .text("Создать промокод")
    .row()
    .text("Выдать запросы")
    .row()
    .text("Выдать админ-панель")
    .row()
    .text("Назад")
    .resized()
    .persistent();
}