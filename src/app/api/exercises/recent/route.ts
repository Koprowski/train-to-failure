import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "14");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all completed sets from the past N days, grouped by exercise
    const recentSets = await prisma.workoutSet.findMany({
      where: {
        OR: [
          { userId },
          { workout: { userId } },
        ],
        createdAt: { gte: since },
        completed: true,
      },
      include: {
        exercise: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by exerciseId, track most recent session
    type SetWithExercise = typeof recentSets[number];
    const exerciseMap = new Map<string, {
      exercise: SetWithExercise["exercise"];
      lastPerformed: Date;
      lastSets: SetWithExercise[];
      lastWorkoutId: string | null;
    }>();

    for (const set of recentSets) {
      if (!exerciseMap.has(set.exerciseId)) {
        exerciseMap.set(set.exerciseId, {
          exercise: set.exercise,
          lastPerformed: set.createdAt,
          lastSets: [],
          lastWorkoutId: set.workoutId,
        });
      }
      const entry = exerciseMap.get(set.exerciseId)!;
      // Only include sets from the most recent workout/session
      if (set.workoutId === entry.lastWorkoutId || (!set.workoutId && !entry.lastWorkoutId)) {
        entry.lastSets.push(set);
      }
    }

    // Build response sorted by most recent
    const result = Array.from(exerciseMap.values())
      .sort((a, b) => b.lastPerformed.getTime() - a.lastPerformed.getTime())
      .map((entry) => {
        const sets = [...entry.lastSets].sort((a: SetWithExercise, b: SetWithExercise) => a.setNumber - b.setNumber);
        const workingSets = sets.filter((s: SetWithExercise) => s.setType === "working");
        const repValues = workingSets.map((s: SetWithExercise) => s.reps).filter((v): v is number => v != null);
        const weightValues = workingSets.map((s: SetWithExercise) => s.weightLbs).filter((v): v is number => v != null);

        let summary = `${sets.length} set${sets.length !== 1 ? "s" : ""}`;
        if (repValues.length > 0 && weightValues.length > 0) {
          const avgReps = Math.round(repValues.reduce((a, b) => a + b, 0) / repValues.length);
          const maxWeight = Math.max(...weightValues);
          summary = `${workingSets.length}x${avgReps} @ ${maxWeight} lbs`;
        }

        return {
          exercise: {
            id: entry.exercise.id,
            name: entry.exercise.name,
            muscleGroups: entry.exercise.muscleGroups,
            imageUrl: entry.exercise.imageUrl,
            type: entry.exercise.type,
            equipment: entry.exercise.equipment,
          },
          lastPerformed: entry.lastPerformed,
          setCount: sets.length,
          summary,
          lastSets: sets.map((s) => ({
            setNumber: s.setNumber,
            setType: s.setType,
            weightLbs: s.weightLbs,
            reps: s.reps,
            timeSecs: s.timeSecs,
            rpe: s.rpe,
          })),
        };
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch recent exercises:", error);
    return NextResponse.json({ error: "Failed to fetch recent exercises" }, { status: 500 });
  }
}
