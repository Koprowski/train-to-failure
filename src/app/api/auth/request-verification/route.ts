import { NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { issueAuthToken } from "@/lib/auth-tokens";
import { createVerifyEmailUrl } from "@/lib/auth-links";
import { sendAuthEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const origin = new URL(request.url).origin;

    const genericResponse = {
      message: "If that email exists, a verification email has been sent.",
    };

    if (!email) {
      return NextResponse.json(genericResponse);
    }

    const user = await prismaBase.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || user.emailVerified || !user.email) {
      return NextResponse.json(genericResponse);
    }

    const { rawToken } = await issueAuthToken({
      identifier: `verify-email:${user.id}`,
      expiresInMinutes: 24 * 60,
    });
    const verificationUrl = createVerifyEmailUrl(rawToken, origin);
    const delivery = await sendAuthEmail({
      to: user.email,
      subject: "Verify your Train to Failure account",
      text: `Verify your email by visiting: ${verificationUrl}`,
      previewUrl: verificationUrl,
    });

    return NextResponse.json({
      ...genericResponse,
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl, delivery } : {}),
    });
  } catch (error) {
    console.error("Failed to request verification email:", error);
    return NextResponse.json({ error: "Failed to send verification email." }, { status: 500 });
  }
}
