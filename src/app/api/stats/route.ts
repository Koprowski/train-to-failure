import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");

    if (!exerciseId) {
      return NextResponse.json(
        { error: "exerciseId query parameter is required" },
        { status: 400 }
      );
    }

    // Get all completed sets for this exercise, filtered by user's workouts
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        completed: true,
        reps: { not: null },
        workout: { userId },
      },
      include: {
        workout: { select: { startedAt: true, name: true } },
      },
      orderBy: { workout: { startedAt: "asc" } },
    });

    // Group sets by workout date and compute stats
    const workoutMap = new Map<
      string,
      { date: string; workoutName: string; maxWeight: number; totalVolume: number; estimated1RM: number; totalReps: number; sets: typeof sets }
    >();

    for (const set of sets) {
      const dateKey = set.workout.startedAt.toISOString().split("T")[0];
      const weight = set.weightLbs ?? 0;
      const reps = set.reps!;
      const volume = weight * reps;

      // Epley formula for estimated 1RM (only meaningful with weight)
      const e1rm = weight > 0 ? (reps === 1 ? weight : weight * (1 + reps / 30)) : 0;

      if (!workoutMap.has(dateKey)) {
        workoutMap.set(dateKey, {
          date: dateKey,
          workoutName: set.workout.name,
          maxWeight: weight,
          totalVolume: 0,
          estimated1RM: e1rm,
          totalReps: 0,
          sets: [],
        });
      }

      const entry = workoutMap.get(dateKey)!;
      entry.totalVolume += volume;
      entry.totalReps += reps;
      if (weight > entry.maxWeight) entry.maxWeight = weight;
      if (e1rm > entry.estimated1RM) entry.estimated1RM = e1rm;
      entry.sets.push(set);
    }

    const history = Array.from(workoutMap.values()).map(({ sets: _sets, ...rest }) => ({
      ...rest,
      estimated1RM: Math.round(rest.estimated1RM * 10) / 10,
    }));

    // Get personal records for this exercise scoped to user
    const personalRecords = await prisma.personalRecord.findMany({
      where: { exerciseId, userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ history, personalRecords });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
