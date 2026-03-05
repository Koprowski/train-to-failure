import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/workouts/[id]/favorite - check if this workout's name is favorited
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const workout = await prisma.workout.findUnique({
      where: { id },
      select: { name: true },
    });
    if (!workout) return NextResponse.json({ favorited: false });

    const fav = await prisma.favoriteWorkout.findUnique({
      where: { userId_name: { userId: userId!, name: workout.name } },
    });
    return NextResponse.json({ favorited: !!fav });
  } catch {
    return NextResponse.json({ favorited: false });
  }
}

// POST /api/workouts/[id]/favorite - toggle favorite for this workout
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const workout = await prisma.workout.findUnique({
      where: { id },
      include: {
        sets: {
          select: { exerciseId: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const existing = await prisma.favoriteWorkout.findUnique({
      where: { userId_name: { userId: userId!, name: workout.name } },
    });

    if (existing) {
      await prisma.favoriteWorkout.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    } else {
      // Get unique exercise IDs in order
      const exerciseIds = [...new Set(workout.sets.map((s) => s.exerciseId))];
      await prisma.favoriteWorkout.create({
        data: {
          userId: userId!,
          name: workout.name,
          exerciseIds: exerciseIds.join(","),
        },
      });
      return NextResponse.json({ favorited: true });
    }
  } catch (err) {
    console.error("Failed to toggle workout favorite:", err);
    return NextResponse.json({ error: "Failed to toggle favorite" }, { status: 500 });
  }
}
