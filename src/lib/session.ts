import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isAdminSessionUser } from "@/lib/access";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
      session: null,
    };
  }

  const userId = session.user.id;
  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      userId: null,
      session: null,
    };
  }

  return { error: null, userId, session };
}

export async function requireAdmin() {
  const auth = await requireAuth();
  if (auth.error) return auth;
  if (!isAdminSessionUser(auth.session?.user)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      userId: auth.userId,
      session: auth.session,
    };
  }

  return auth;
}
