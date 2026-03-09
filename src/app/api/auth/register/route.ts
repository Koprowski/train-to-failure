import { NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { issueAuthToken } from "@/lib/auth-tokens";
import { createVerifyEmailUrl } from "@/lib/auth-links";
import { sendAuthEmail } from "@/lib/email";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const origin = new URL(request.url).origin;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existingUser = await prismaBase.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prismaBase.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const { rawToken } = await issueAuthToken({
      identifier: `verify-email:${user.id}`,
      expiresInMinutes: 24 * 60,
    });
    const verificationUrl = createVerifyEmailUrl(rawToken, origin);
    const delivery = await sendAuthEmail({
      to: user.email || email,
      subject: "Verify your Train to Failure account",
      text: `Verify your email by visiting: ${verificationUrl}`,
      previewUrl: verificationUrl,
    });

    return NextResponse.json({
      user,
      message: "Account created. Check your email to verify your account before signing in.",
      ...(process.env.NODE_ENV !== "production" ? { verificationUrl, delivery } : {}),
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to register user:", error);
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
