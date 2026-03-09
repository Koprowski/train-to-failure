export function getBaseUrl(origin?: string) {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || origin || "http://localhost:3000";
}

export function createVerifyEmailUrl(token: string, origin?: string) {
  return new URL(`/verify-email?token=${encodeURIComponent(token)}`, getBaseUrl(origin)).toString();
}

export function createResetPasswordUrl(token: string, origin?: string) {
  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, getBaseUrl(origin)).toString();
}
