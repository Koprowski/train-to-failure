import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length ?? 0,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 12) ?? "MISSING",
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    secretLength: process.env.GOOGLE_CLIENT_SECRET?.length ?? 0,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL ?? "MISSING",
  });
}
