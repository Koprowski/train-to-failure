import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    // Clamp to valid range
    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const since = new Date();
    since.setDate(since.getDate() - validDays);

    // Get all completed sets within the time range with their exercise info, filtered by user
    const sets = await prisma.workoutSet.findMany({
      where: {
        completed: true,
        workout: { startedAt: { gte: since }, userId },
      },
      include: {
        exercise: { select: { muscleGroups: true } },
      },
    });

    // Count sets per muscle group
    const muscleGroupCounts: Record<string, number> = {};

    for (const set of sets) {
      const groups = set.exercise.muscleGroups
        .split(",")
        .map((g: string) => g.trim().toLowerCase())
        .filter(Boolean);

      for (const group of groups) {
        muscleGroupCounts[group] = (muscleGroupCounts[group] ?? 0) + 1;
      }
    }

    // Convert to sorted array
    const data = Object.entries(muscleGroupCounts)
      .map(([muscleGroup, setCount]) => ({ muscleGroup, setCount }))
      .sort((a, b) => b.setCount - a.setCount);

    return NextResponse.json({ days: validDays, data });
  } catch (error) {
    console.error("Failed to fetch muscle group stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch muscle group stats" },
      { status: 500 }
    );
  }
}
