import { InlineKeyboard, Keyboard } from "grammy";

export const mainKeyboard = new Keyboard()
  .text("Задать вопрос")
  .text("Профиль")
  .row()
  .text("Ввести промокод")
  .text("Купить запросы")
  .row()
  .text("Заработать алмазы")
  .resized()
  .persistent();

export function askKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Сгенерировать изображение", "ask:image")
    .row()
    .text("Назад", "nav:home");
}

export function shopKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("5 запросов — 100 ♦", "buy:5:100")
    .text("10 запросов — 300 ♦", "buy:10:300")
    .row()
    .text("20 запросов — 400 ♦", "buy:20:400")
    .text("100 запросов — 1500 ♦", "buy:100:1500")
    .row()
    .text("∞ запросов — 50 000 ♦", "buy:inf:50000")
    .row()
    .text("Назад", "nav:home");
}

export function adminKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Создать промокод", "admin:create_promo")
    .row()
    .text("Выдать запросы", "admin:grant_requests")
    .row()
    .text("Выдать админ-панель", "admin:grant_admin")
    .row()
    .text("Назад", "nav:home");
}