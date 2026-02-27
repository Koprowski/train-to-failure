import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify workout belongs to user
    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const sets = await prisma.workoutSet.findMany({
      where: { workoutId: id },
      include: { exercise: true },
      orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Failed to fetch sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch sets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify workout belongs to user
    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const body = await request.json();
    const { exerciseId, setNumber, setType, reps, weightLbs, timeSecs, rpe, restSecs, notes, completed, supersetGroup } = body;

    if (!exerciseId) {
      return NextResponse.json(
        { error: "exerciseId is required" },
        { status: 400 }
      );
    }

    // Auto-calculate setNumber if not provided
    let finalSetNumber = setNumber;
    if (finalSetNumber == null) {
      const lastSet = await prisma.workoutSet.findFirst({
        where: { workoutId: id, exerciseId },
        orderBy: { setNumber: "desc" },
      });
      finalSetNumber = lastSet ? lastSet.setNumber + 1 : 1;
    }

    const set = await prisma.workoutSet.create({
      data: {
        workoutId: id,
        exerciseId,
        setNumber: finalSetNumber,
        setType: setType ?? "working",
        reps: reps ?? null,
        weightLbs: weightLbs ?? null,
        timeSecs: timeSecs ?? null,
        rpe: rpe ?? null,
        restSecs: restSecs ?? null,
        notes: notes ?? null,
        completed: completed ?? false,
        supersetGroup: supersetGroup ?? null,
      },
      include: { exercise: true },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error("Failed to create set:", error);
    return NextResponse.json(
      { error: "Failed to create set" },
      { status: 500 }
    );
  }
}
