import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET - fetch all standalone (non-workout) sets for the user, grouped chronologically
export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {
      userId,
      workoutId: null,
    };
    if (exerciseId) {
      where.exerciseId = exerciseId;
    }

    const sets = await prisma.workoutSet.findMany({
      where,
      include: { exercise: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Failed to fetch quick log sets:", error);
    return NextResponse.json({ error: "Failed to fetch sets" }, { status: 500 });
  }
}

// POST - log a standalone set (no workout required)
export async function POST(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { exerciseId, setType, reps, weightLbs, timeSecs, rpe, notes } = body;

    if (!exerciseId) {
      return NextResponse.json({ error: "exerciseId is required" }, { status: 400 });
    }

    const set = await prisma.workoutSet.create({
      data: {
        userId,
        exerciseId,
        setNumber: 1,
        setType: setType || "working",
        reps: reps ? parseInt(reps) : null,
        weightLbs: weightLbs ? parseFloat(weightLbs) : null,
        timeSecs: timeSecs ? parseInt(timeSecs) : null,
        rpe: rpe ? parseFloat(rpe) : null,
        notes: notes || null,
        completed: true,
      },
      include: { exercise: true },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error("Failed to create quick log set:", error);
    return NextResponse.json({ error: "Failed to create set" }, { status: 500 });
  }
}
