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
      orderBy: [{ workout: { startedAt: "asc" } }, { setNumber: "asc" }],
    });

    // Group sets by workout date and compute stats
    const workoutMap = new Map<
      string,
      {
        date: string;
        workoutName: string;
        maxWeight: number;
        averageWeight: number;
        totalVolume: number;
        estimated1RM: number;
        totalReps: number;
        sets: { setNumber: number; weightLbs: number | null; reps: number | null }[];
        weightedVolume: number;
        weightedReps: number;
      }
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
          averageWeight: weight,
          totalVolume: 0,
          estimated1RM: e1rm,
          totalReps: 0,
          sets: [],
          weightedVolume: weight > 0 ? weight * reps : 0,
          weightedReps: weight > 0 ? reps : 0,
        });
      }

      const entry = workoutMap.get(dateKey)!;
      entry.totalVolume += volume;
      entry.totalReps += reps;
      if (weight > entry.maxWeight) entry.maxWeight = weight;
      if (weight > 0) {
        entry.weightedVolume += weight * reps;
        entry.weightedReps += reps;
        entry.averageWeight = entry.weightedVolume / entry.weightedReps;
      }
      if (e1rm > entry.estimated1RM) entry.estimated1RM = e1rm;
      entry.sets.push({ setNumber: set.setNumber, weightLbs: set.weightLbs, reps: set.reps });
    }

    const history = Array.from(workoutMap.values()).map((entry) => ({
      date: entry.date,
      workoutName: entry.workoutName,
      maxWeight: entry.maxWeight,
      averageWeight: Math.round(entry.averageWeight * 10) / 10,
      totalVolume: entry.totalVolume,
      estimated1RM: Math.round(entry.estimated1RM * 10) / 10,
      totalReps: entry.totalReps,
      sets: entry.sets.sort((a, b) => a.setNumber - b.setNumber),
    }));
    // PersonalRecord is not user-scoped in the schema. Avoid leaking cross-user data from this endpoint until the model is corrected.
    return NextResponse.json({ history, personalRecords: [] });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}


