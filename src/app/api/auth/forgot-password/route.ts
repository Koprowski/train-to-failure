import { NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { issueAuthToken } from "@/lib/auth-tokens";
import { createResetPasswordUrl } from "@/lib/auth-links";
import { sendAuthEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const origin = new URL(request.url).origin;

    const genericResponse = {
      message: "If that email exists, a password reset link has been sent.",
    };

    if (!email) {
      return NextResponse.json(genericResponse);
    }

    const user = await prismaBase.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !user.email || !user.passwordHash) {
      return NextResponse.json(genericResponse);
    }

    const { rawToken } = await issueAuthToken({
      identifier: `reset-password:${user.id}`,
      expiresInMinutes: 60,
    });
    const resetUrl = createResetPasswordUrl(rawToken, origin);
    const delivery = await sendAuthEmail({
      to: user.email,
      subject: "Reset your Train to Failure password",
      text: `Reset your password by visiting: ${resetUrl}`,
      previewUrl: resetUrl,
    });

    return NextResponse.json({
      ...genericResponse,
      ...(process.env.NODE_ENV !== "production" ? { resetUrl, delivery } : {}),
    });
  } catch (error) {
    console.error("Failed to request password reset:", error);
    return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
  }
}
