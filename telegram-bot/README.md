# Telegram AI Bot

Безопасный Telegram-бот на TypeScript с AI-ответами, генерацией изображений, дневным лимитом, реферальной системой, промокодами и закрытой админ-панелью.

Админ-кнопка видна только владельцу из `ADMIN_TELEGRAM_ID` и пользователям, которым владелец выдал права через админ-панель. Команда `/admin` также защищена проверкой прав.

## Настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather).
2. Скопируйте `.env.example` в `.env`.
3. Заполните `TELEGRAM_BOT_TOKEN` и `ADMIN_TELEGRAM_ID`.
4. Подключите Replit AI Integration или укажите `OPENAI_API_KEY`.

```bash
pnpm install
pnpm --filter @workspace/telegram-bot run start
```

## GitHub

https://github.com/g6155809-blip/telegram-bot