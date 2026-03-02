import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/exercises/favorites - list user's favorite exercise IDs
export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const favorites = await prisma.favoriteExercise.findMany({
    where: { userId: userId! },
    select: { exerciseId: true },
  });

  return NextResponse.json(favorites.map((f) => f.exerciseId));
}

// POST /api/exercises/favorites - toggle favorite for an exercise
export async function POST(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { exerciseId } = await req.json();
  if (!exerciseId) {
    return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  }

  const existing = await prisma.favoriteExercise.findUnique({
    where: { userId_exerciseId: { userId: userId!, exerciseId } },
  });

  if (existing) {
    await prisma.favoriteExercise.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  } else {
    await prisma.favoriteExercise.create({
      data: { userId: userId!, exerciseId },
    });
    return NextResponse.json({ favorited: true });
  }
}
