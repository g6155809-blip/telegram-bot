export type PendingAction =
  | "question"
  | "image"
  | "promo"
  | "admin_promo_diamonds"
  | "admin_promo_uses"
  | "admin_grant_requests_user"
  | "admin_grant_requests_amount"
  | "admin_grant_admin";

export type User = {
  id: number;
  username?: string;
  firstName: string;
  registeredAt: string;
  lastResetDate: string;
  dailyUsed: number;
  bonusRequests: number;
  diamonds: number;
  referredBy?: number;
  referredUserIds: number[];
  isAdmin: boolean;
  unlimited: boolean;
};

export type PromoCode = {
  code: string;
  diamonds: number;
  maxUses: number;
  usedBy: number[];
  createdAt: string;
};

export type State = {
  users: Record<string, User>;
  promoCodes: Record<string, PromoCode>;
};

export type SessionData = {
  pending?: PendingAction;
  targetUsername?: string;
};