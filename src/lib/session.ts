import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), userId: null };
  }
  return { error: null, userId };
}
