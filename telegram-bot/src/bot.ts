import { Bot, InlineKeyboard, type Context, InputFile, session, type SessionFlavor } from "grammy";
import { AiServiceError, answerQuestion, generateImage } from "./ai.js";
import { config, githubUrl, normalizeUsername, ownerId } from "./config.js";
import {
  adminKeyboard,
  askKeyboard,
  githubKeyboard,
  mainKeyboard,
  shopKeyboard,
} from "./keyboards.js";
import {
  addAdmin,
  addRequests,
  allUserCount,
  buyRequests,
  consumeRequest,
  createPromoCode,
  findUserByUsername,
  getOrCreateUser,
  markReferral,
  refundRequest,
  redeemPromo,
  requestStatus,
} from "./storage.js";
import type { SessionData, User } from "./types.js";

type BotContext = Context & SessionFlavor<SessionData>;

function userFrom(ctx: BotContext): User {
  const from = ctx.from;
  if (!from) throw new Error("Telegram user is missing");
  return getOrCreateUser(from.id, from.first_name, from.username).user;
}

function isAdmin(ctx: BotContext): boolean {
  const user = userFrom(ctx);
  return user.id === ownerId || user.isAdmin;
}

function mainMenu(ctx: BotContext) {
  return mainKeyboard(isAdmin(ctx));
}

function displayName(user: User): string {
  return user.username ? `@${user.username}` : user.firstName;
}

function clearPending(ctx: BotContext): void {
  ctx.session.pending = undefined;
  ctx.session.targetUsername = undefined;
}

function profileText(user: User): string {
  const status = requestStatus(user);
  return [
    "👤 Профиль",
    "",
    `🙋 Пользователь: ${displayName(user)}`,
    `📅 Дата регистрации: ${new Date(user.registeredAt).toLocaleString("ru-RU")}`,
    `💎 Алмазы: ${user.diamonds} ♦`,
    `📊 Запросы сегодня: ${status.used}/${status.limit}`,
    `⚡ Доступно сейчас: ${status.remaining}`,
    `🤝 Рефералы: ${user.referredUserIds.length}`,
    `🛡️ Админ-панель: ${user.isAdmin || user.id === ownerId ? "доступна" : "нет"}`,
  ].join("\n");
}

async function home(ctx: BotContext): Promise<void> {
  clearPending(ctx);
  await ctx.reply("🏠 Главное меню\n\nВыберите действие:", { reply_markup: mainMenu(ctx) });
}

async function start(ctx: BotContext): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const result = getOrCreateUser(from.id, from.first_name, from.username);
  const payload = ctx.match;
  if (result.created && typeof payload === "string" && payload.startsWith("ref_")) {
    const inviterId = Number(payload.slice(4));
    if (Number.isInteger(inviterId) && markReferral(inviterId, from.id)) {
      await ctx.api.sendMessage(
        inviterId,
        "🎉 Новый участник присоединился по вашей ссылке. Вам начислено 10 ♦.",
      );
    }
  }
  await ctx.reply(
    `✨ Привет, ${from.first_name}!\n\nЯ AI-помощник: отвечаю на вопросы и умею создавать изображения.\n\n📌 Вам доступно 5 запросов в день. Используйте меню ниже.`,
    { reply_markup: mainMenu(ctx) },
  );
}

async function ask(ctx: BotContext): Promise<void> {
  const user = userFrom(ctx);
  const status = requestStatus(user);
  ctx.session.pending = "question";
  await ctx.reply(
    `💬 Привет, ${user.firstName}!\n\nСпросите меня о чем угодно — я отвечу и могу сгенерировать изображение.\n\n⚡ Осталось запросов: ${status.remaining}`,
    { reply_markup: askKeyboard() },
  );
}

async function handleQuestion(ctx: BotContext, text: string): Promise<void> {
  const user = userFrom(ctx);
  const consumption = consumeRequest(user);
  if (!consumption) {
    clearPending(ctx);
    await ctx.reply(
      "⏳ Дневной лимит исчерпан. Пригласите друзей или купите дополнительные запросы за алмазы.",
      { reply_markup: mainMenu(ctx) },
    );
    return;
  }
  clearPending(ctx);
  await ctx.reply("🧠 Думаю над ответом...");
  try {
    const answer = await answerQuestion(text, displayName(user));
    await ctx.reply(answer, { reply_markup: mainMenu(ctx) });
  } catch (error) {
    refundRequest(user, consumption);
    await ctx.reply(
      error instanceof AiServiceError
        ? error.userMessage
        : "⚠️ AI-сервис временно недоступен. Ваш запрос возвращён — попробуйте ещё раз немного позже.",
      { reply_markup: mainMenu(ctx) },
    );
    console.error("AI question failed", error);
  }
}

async function handleImage(ctx: BotContext, prompt: string): Promise<void> {
  const user = userFrom(ctx);
  const consumption = consumeRequest(user);
  if (!consumption) {
    clearPending(ctx);
    await ctx.reply("⏳ Лимит запросов исчерпан. Получите дополнительные запросы в разделе покупки.", {
      reply_markup: mainMenu(ctx),
    });
    return;
  }
  clearPending(ctx);
  await ctx.reply("🎨 Генерирую изображение...");
  try {
    const image = await generateImage(prompt);
    await ctx.replyWithPhoto(new InputFile(image, "generated.png"), {
      caption: "✅ Готово! Если хотите — задайте следующий запрос.",
      reply_markup: mainMenu(ctx),
    });
  } catch (error) {
    refundRequest(user, consumption);
    await ctx.reply(
      error instanceof AiServiceError
        ? error.userMessage
        : "⚠️ Не удалось создать изображение. Ваш запрос возвращён — попробуйте ещё раз позже.",
      { reply_markup: mainMenu(ctx) },
    );
    console.error("AI image failed", error);
  }
}

async function handlePending(ctx: BotContext, text: string): Promise<boolean> {
  const pending = ctx.session.pending;
  if (!pending) return false;
  if (pending === "question") {
    await handleQuestion(ctx, text);
    return true;
  }
  if (pending === "image") {
    await handleImage(ctx, text);
    return true;
  }
  if (pending === "promo") {
    const user = userFrom(ctx);
    clearPending(ctx);
    const result = redeemPromo(user, text);
    await ctx.reply(
      result.ok ? `✅ Промокод активирован. Начислено ${result.diamonds} ♦.` : `⚠️ ${result.reason}`,
      { reply_markup: mainMenu(ctx) },
    );
    return true;
  }
  if (pending === "admin_promo_diamonds") {
    const diamonds = Number(text);
    if (!Number.isInteger(diamonds) || diamonds < 1 || diamonds > 10_000_000_000) {
      await ctx.reply("Введите целое число алмазов от 1 до 10 000 000 000.");
      return true;
    }
    ctx.session.pending = "admin_promo_uses";
    ctx.session.targetUsername = String(diamonds);
    await ctx.reply("Введите количество использований (0 — без ограничений):");
    return true;
  }
  if (pending === "admin_promo_uses") {
    const maxUses = Number(text);
    const diamonds = Number(ctx.session.targetUsername);
    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 100_000) {
      await ctx.reply("Введите целое число от 0 до 100 000.");
      return true;
    }
    clearPending(ctx);
    const promo = createPromoCode(diamonds, maxUses);
    await ctx.reply(
      `✅ Промокод создан:\n\n<code>${promo.code}</code>\n\n💎 Алмазы: ${diamonds}\n🔁 Использований: ${maxUses === 0 ? "без ограничений" : maxUses}`,
      { reply_markup: adminKeyboard(), parse_mode: "HTML" },
    );
    return true;
  }
  if (pending === "admin_grant_requests_user") {
    const username = normalizeUsername(text);
    if (!username) {
      await ctx.reply("Введите корректный юзернейм, например @username.");
      return true;
    }
    ctx.session.pending = "admin_grant_requests_amount";
    ctx.session.targetUsername = username;
    await ctx.reply("Введите количество запросов:");
    return true;
  }
  if (pending === "admin_grant_requests_amount") {
    const amount = Number(text);
    const target = findUserByUsername(ctx.session.targetUsername ?? "");
    if (!target) {
      clearPending(ctx);
      await ctx.reply("Пользователь не найден. Он должен сначала нажать /start в боте.", {
        reply_markup: adminKeyboard(),
      });
      return true;
    }
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      await ctx.reply("Введите целое число запросов от 1 до 1 000 000.");
      return true;
    }
    clearPending(ctx);
    addRequests(target, amount);
    await ctx.reply(`✅ Выдано ${amount} запросов пользователю @${target.username}.`, {
      reply_markup: adminKeyboard(),
    });
    return true;
  }
  if (pending === "admin_grant_admin") {
    const target = findUserByUsername(text);
    clearPending(ctx);
    if (!target) {
      await ctx.reply("Пользователь не найден. Он должен сначала нажать /start в боте.", {
        reply_markup: adminKeyboard(),
      });
    } else {
      addAdmin(target);
      await ctx.reply(`👑 Админ-панель выдана пользователю @${target.username}.`, {
        reply_markup: adminKeyboard(),
      });
    }
    return true;
  }
  return false;
}

async function openAdmin(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply("⛔ Доступ запрещён.", { reply_markup: mainMenu(ctx) });
    return;
  }
  clearPending(ctx);
  await ctx.reply(`🛠️ Админ-панель\n\n👥 Пользователей: ${allUserCount()}`, {
    reply_markup: adminKeyboard(),
  });
}

async function createPromo(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply("⛔ Доступ запрещён.", { reply_markup: mainMenu(ctx) });
    return;
  }
  ctx.session.pending = "admin_promo_diamonds";
  await ctx.reply("💎 Введите количество алмазов для промокода (1–10 000 000 000):", {
    reply_markup: adminKeyboard(),
  });
}

async function grantRequests(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply("⛔ Доступ запрещён.", { reply_markup: mainMenu(ctx) });
    return;
  }
  ctx.session.pending = "admin_grant_requests_user";
  await ctx.reply("👤 Введите юзернейм пользователя:", { reply_markup: adminKeyboard() });
}

async function grantAdmin(ctx: BotContext): Promise<void> {
  if (!isAdmin(ctx)) {
    await ctx.reply("⛔ Доступ запрещён.", { reply_markup: mainMenu(ctx) });
    return;
  }
  ctx.session.pending = "admin_grant_admin";
  await ctx.reply("👑 Введите юзернейм пользователя:", { reply_markup: adminKeyboard() });
}

async function purchaseRequests(ctx: BotContext, amount: number, cost: number): Promise<void> {
  const user = userFrom(ctx);
  if (!buyRequests(user, amount, cost)) {
    await ctx.reply(`⚠️ Недостаточно алмазов. Нужно ${cost} ♦, у вас ${user.diamonds} ♦.`, {
      reply_markup: mainMenu(ctx),
    });
    return;
  }
  await ctx.reply(
    amount === Number.POSITIVE_INFINITY
      ? "✅ Активированы бесконечные запросы."
      : `✅ Начислено ${amount} запросов.`,
    { reply_markup: mainMenu(ctx) },
  );
}

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(config.TELEGRAM_BOT_TOKEN);
  bot.use(session({ initial: (): SessionData => ({}) }));

  bot.command("start", start);
  bot.command("profile", async (ctx) =>
    ctx.reply(profileText(userFrom(ctx)), { reply_markup: mainMenu(ctx) }),
  );
  bot.command("admin", openAdmin);

  bot.hears("💬 Задать вопрос", ask);
  bot.hears("👤 Профиль", async (ctx) => {
    clearPending(ctx);
    await ctx.reply(profileText(userFrom(ctx)), { reply_markup: mainMenu(ctx) });
  });
  bot.hears("🎟️ Ввести промокод", async (ctx) => {
    ctx.session.pending = "promo";
    await ctx.reply("🎟️ Введите промокод:", { reply_markup: mainMenu(ctx) });
  });
  bot.hears("💎 Купить запросы", async (ctx) => {
    clearPending(ctx);
    await ctx.reply("💎 Выберите пакет. Алмазы начисляются через рефералов или промокоды.", {
      reply_markup: shopKeyboard(),
    });
  });
  bot.hears("🤝 Заработать алмазы", async (ctx) => {
    const user = userFrom(ctx);
    const me = await ctx.api.getMe();
    const link = `https://t.me/${me.username}?start=ref_${user.id}`;
    await ctx.reply(
      `🤝 За каждого нового участника вы получите 10 ♦.\n\n👥 Приглашено: ${user.referredUserIds.length}\n🔗 Ваша ссылка:\n${link}`,
      { reply_markup: mainMenu(ctx) },
    );
  });
  bot.hears("🔗 GitHub проекта", async (ctx) => {
    clearPending(ctx);
    await ctx.reply(`📦 Исходный код проекта:\n${githubUrl}`, { reply_markup: githubKeyboard });
  });
  bot.hears("🎨 Сгенерировать изображение", async (ctx) => {
    ctx.session.pending = "image";
    await ctx.reply("🎨 Опишите изображение, которое нужно создать.", {
      reply_markup: askKeyboard(),
    });
  });
  bot.hears("↩️ Назад", home);
  bot.hears("🛠️ Админ-панель", openAdmin);
  bot.hears("🧾 Создать промокод", createPromo);
  bot.hears("🎁 Выдать запросы", grantRequests);
  bot.hears("👑 Выдать админ-панель", grantAdmin);
  bot.hears("5 запросов — 100 ♦", (ctx) => purchaseRequests(ctx, 5, 100));
  bot.hears("10 запросов — 300 ♦", (ctx) => purchaseRequests(ctx, 10, 300));
  bot.hears("20 запросов — 400 ♦", (ctx) => purchaseRequests(ctx, 20, 400));
  bot.hears("100 запросов — 1500 ♦", (ctx) => purchaseRequests(ctx, 100, 1500));
  bot.hears("∞ запросов — 50 000 ♦", (ctx) =>
    purchaseRequests(ctx, Number.POSITIVE_INFINITY, 50_000),
  );

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (await handlePending(ctx, text)) return;
    if (text.startsWith("/")) return;
    await ctx.reply("ℹ️ Выберите действие в меню.", { reply_markup: mainMenu(ctx) });
  });

  bot.catch((error) => {
    console.error("Telegram bot error", error.error);
  });
  return bot;
}