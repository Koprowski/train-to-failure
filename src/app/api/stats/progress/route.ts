import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");
    const days = parseInt(searchParams.get("days") || "90", 10);

    if (!exerciseId) {
      return NextResponse.json(
        { error: "exerciseId query parameter is required" },
        { status: 400 }
      );
    }

    const since = new Date();
    if (days > 0) {
      since.setDate(since.getDate() - days);
    } else {
      since.setFullYear(2000);
    }

    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        completed: true,
        weightLbs: { not: null },
        reps: { not: null },
        workout: {
          userId,
          startedAt: { gte: since },
        },
      },
      include: {
        workout: { select: { startedAt: true } },
      },
      orderBy: [
        { workout: { startedAt: "asc" } },
        { setNumber: "asc" },
      ],
    });

    // Group by workout date
    const sessionMap = new Map<string, {
      date: string;
      sets: { setNumber: number; weightLbs: number; reps: number; rpe: number | null }[];
      totalVolume: number;
    }>();

    for (const set of sets) {
      const dateKey = set.workout!.startedAt.toISOString().split("T")[0];

      if (!sessionMap.has(dateKey)) {
        sessionMap.set(dateKey, { date: dateKey, sets: [], totalVolume: 0 });
      }

      const session = sessionMap.get(dateKey)!;
      const weight = set.weightLbs!;
      const reps = set.reps!;
      session.sets.push({
        setNumber: set.setNumber,
        weightLbs: weight,
        reps,
        rpe: set.rpe,
      });
      session.totalVolume += weight * reps;
    }

    const sessions = Array.from(sessionMap.values());

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Failed to fetch progress stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress stats" },
      { status: 500 }
    );
  }
}
