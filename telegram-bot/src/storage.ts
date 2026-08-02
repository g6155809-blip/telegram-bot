import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { config, normalizeUsername, ownerId } from "./config.js";
import type { PromoCode, State, User } from "./types.js";

const initialState: State = { users: {}, promoCodes: {} };
let state: State = structuredClone(initialState);
let writeQueue = Promise.resolve();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function newUser(id: number, firstName: string, username?: string): User {
  return {
    id,
    firstName,
    username: normalizeUsername(username),
    registeredAt: new Date().toISOString(),
    lastResetDate: today(),
    dailyUsed: 0,
    bonusRequests: 0,
    diamonds: 0,
    referredUserIds: [],
    isAdmin: id === ownerId,
    unlimited: false,
  };
}

export async function loadState(): Promise<void> {
  const filePath = path.resolve(config.DATA_FILE);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<State>;
    state = {
      users: parsed.users ?? {},
      promoCodes: parsed.promoCodes ?? {},
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    if (code !== "ENOENT") throw error;
    await persist();
  }
}

async function persist(): Promise<void> {
  const filePath = path.resolve(config.DATA_FILE);
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
  await rename(tempPath, filePath);
}

function save(): void {
  writeQueue = writeQueue.then(persist).catch(() => undefined);
}

function resetIfNeeded(user: User): void {
  if (user.lastResetDate !== today()) {
    user.lastResetDate = today();
    user.dailyUsed = 0;
    save();
  }
}

export function getUser(id: number): User | undefined {
  const user = state.users[String(id)];
  if (user) resetIfNeeded(user);
  return user;
}

export function getOrCreateUser(
  id: number,
  firstName: string,
  username?: string,
): { user: User; created: boolean } {
  const key = String(id);
  let user = state.users[key];
  let created = false;
  if (!user) {
    user = newUser(id, firstName, username);
    state.users[key] = user;
    created = true;
    save();
  } else {
    resetIfNeeded(user);
    user.firstName = firstName;
    user.username = normalizeUsername(username);
    if (id === ownerId) user.isAdmin = true;
    save();
  }
  return { user, created };
}

export function findUserByUsername(username: string): User | undefined {
  const normalized = normalizeUsername(username);
  if (!normalized) return undefined;
  return Object.values(state.users).find((user) => user.username === normalized);
}

export function markReferral(inviterId: number, newUserId: number): boolean {
  if (inviterId === newUserId) return false;
  const inviter = state.users[String(inviterId)];
  const newUser = state.users[String(newUserId)];
  if (!inviter || !newUser || newUser.referredBy || inviter.referredUserIds.includes(newUserId)) {
    return false;
  }
  newUser.referredBy = inviterId;
  inviter.referredUserIds.push(newUserId);
  inviter.diamonds += 10;
  save();
  return true;
}

export function requestStatus(user: User): { used: number; limit: number | "∞"; remaining: number | "∞" } {
  resetIfNeeded(user);
  if (user.unlimited) return { used: user.dailyUsed, limit: "∞", remaining: "∞" };
  const remaining = Math.max(0, 5 - user.dailyUsed + user.bonusRequests);
  return { used: user.dailyUsed, limit: 5 + user.bonusRequests, remaining };
}

export function consumeRequest(user: User): boolean {
  resetIfNeeded(user);
  if (user.unlimited) {
    user.dailyUsed += 1;
    save();
    return true;
  }
  if (user.dailyUsed < 5) {
    user.dailyUsed += 1;
    save();
    return true;
  }
  if (user.bonusRequests > 0) {
    user.bonusRequests -= 1;
    save();
    return true;
  }
  return false;
}

export function buyRequests(user: User, amount: number, cost: number): boolean {
  if (user.diamonds < cost) return false;
  user.diamonds -= cost;
  if (amount === Number.POSITIVE_INFINITY) user.unlimited = true;
  else user.bonusRequests += amount;
  save();
  return true;
}

export function addRequests(user: User, amount: number): void {
  user.bonusRequests += amount;
  save();
}

export function addAdmin(user: User): void {
  user.isAdmin = true;
  save();
}

export function createPromoCode(diamonds: number, maxUses: number): PromoCode {
  let code = "";
  do {
    code = `AI-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  } while (state.promoCodes[code]);
  const promo: PromoCode = {
    code,
    diamonds,
    maxUses,
    usedBy: [],
    createdAt: new Date().toISOString(),
  };
  state.promoCodes[code] = promo;
  save();
  return promo;
}

export function redeemPromo(user: User, rawCode: string): { ok: true; diamonds: number } | { ok: false; reason: string } {
  const code = rawCode.trim().toUpperCase();
  const promo = state.promoCodes[code];
  if (!promo) return { ok: false, reason: "Промокод не найден." };
  if (promo.usedBy.includes(user.id)) return { ok: false, reason: "Вы уже использовали этот промокод." };
  if (promo.maxUses > 0 && promo.usedBy.length >= promo.maxUses) {
    return { ok: false, reason: "Лимит использований этого промокода исчерпан." };
  }
  promo.usedBy.push(user.id);
  user.diamonds += promo.diamonds;
  save();
  return { ok: true, diamonds: promo.diamonds };
}

export function allUserCount(): number {
  return Object.keys(state.users).length;
}