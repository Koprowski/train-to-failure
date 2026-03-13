import type { Session } from "next-auth";

export type UserRole = "USER" | "ADMIN";
export type AccountType = "FREE" | "PAID";

type AccessProfileInput = {
  email?: string | null;
  role?: string | null;
  accountType?: string | null;
  googleAccountId?: string | null;
};

const ADMIN_EMAILS = new Set([
  "koprowski@gmail.com",
  "kimberley.koprowski@gmail.com",
]);

const ADMIN_GOOGLE_ACCOUNT_IDS = new Set(
  (process.env.ADMIN_GOOGLE_ACCOUNT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

export function getAccessProfile(input: AccessProfileInput) {
  const normalizedEmail = normalizeEmail(input.email);
  const isAdmin =
    input.role === "ADMIN" ||
    (normalizedEmail ? ADMIN_EMAILS.has(normalizedEmail) : false) ||
    (input.googleAccountId ? ADMIN_GOOGLE_ACCOUNT_IDS.has(input.googleAccountId) : false);

  return {
    role: (isAdmin ? "ADMIN" : "USER") as UserRole,
    accountType: ((isAdmin || input.accountType === "PAID") ? "PAID" : "FREE") as AccountType,
    isAdmin,
  };
}

export function isAdminSessionUser(user?: Session["user"] | null) {
  if (!user) return false;
  const sessionUser = user as Session["user"] & {
    role?: string | null;
    accountType?: string | null;
    googleAccountId?: string | null;
  };

  return getAccessProfile({
    email: sessionUser.email,
    role: sessionUser.role,
    accountType: sessionUser.accountType,
    googleAccountId: sessionUser.googleAccountId,
  }).isAdmin;
}

export function isPaidSessionUser(user?: Session["user"] | null) {
  if (!user) return false;
  const sessionUser = user as Session["user"] & {
    role?: string | null;
    accountType?: string | null;
    googleAccountId?: string | null;
  };

  return getAccessProfile({
    email: sessionUser.email,
    role: sessionUser.role,
    accountType: sessionUser.accountType,
    googleAccountId: sessionUser.googleAccountId,
  }).accountType === "PAID";
}

export function canUploadExerciseImageSessionUser(user?: Session["user"] | null) {
  return isAdminSessionUser(user) || isPaidSessionUser(user);
}
