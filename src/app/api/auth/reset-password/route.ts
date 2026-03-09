import { NextResponse } from "next/server";
import { prismaBase } from "@/lib/prisma";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const record = await consumeAuthToken(token);
    if (!record || !record.identifier.startsWith("reset-password:")) {
      return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });
    }

    const userId = record.identifier.replace("reset-password:", "");
    const passwordHash = await hashPassword(password);

    await prismaBase.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}
