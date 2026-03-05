import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET /api/workouts/favorites - list all favorite workouts with exercise details
export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const favorites = await prisma.favoriteWorkout.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "desc" },
    });

    // Resolve exercise names for each favorite
    const allExerciseIds = new Set<string>();
    for (const fav of favorites) {
      fav.exerciseIds.split(",").filter(Boolean).forEach((id) => allExerciseIds.add(id));
    }

    const exercises = await prisma.exercise.findMany({
      where: { id: { in: Array.from(allExerciseIds) } },
      select: { id: true, name: true, muscleGroups: true },
    });
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    const result = favorites.map((fav) => ({
      id: fav.id,
      name: fav.name,
      createdAt: fav.createdAt,
      exercises: fav.exerciseIds
        .split(",")
        .filter(Boolean)
        .map((id) => exerciseMap.get(id))
        .filter(Boolean),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
