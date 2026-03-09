import { NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth-tokens";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";

    if (!token) {
      return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
    }

    const record = await consumeAuthToken(token);
    if (!record || !record.identifier.startsWith("verify-email:")) {
      return NextResponse.json({ error: "Verification link is invalid or expired." }, { status: 400 });
    }

    const userId = record.identifier.replace("verify-email:", "");

    await prismaBase.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ message: "Email verified. You can now sign in." });
  } catch (error) {
    console.error("Failed to verify email:", error);
    return NextResponse.json({ error: "Failed to verify email." }, { status: 500 });
  }
}
