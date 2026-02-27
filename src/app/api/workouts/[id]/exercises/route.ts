import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const workoutExercises = await prisma.workoutExercise.findMany({
      where: { workoutId: id },
      include: {
        exercise: true,
        sets: { orderBy: { setNumber: "asc" } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(workoutExercises);
  } catch (error) {
    console.error("Failed to fetch workout exercises:", error);
    return NextResponse.json({ error: "Failed to fetch workout exercises" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const body = await request.json();
    const { exerciseId } = body;

    if (!exerciseId) {
      return NextResponse.json({ error: "exerciseId is required" }, { status: 400 });
    }

    // Get next order number
    const lastExercise = await prisma.workoutExercise.findFirst({
      where: { workoutId: id },
      orderBy: { order: "desc" },
    });
    const order = lastExercise ? lastExercise.order + 1 : 0;

    const workoutExercise = await prisma.workoutExercise.create({
      data: {
        workoutId: id,
        exerciseId,
        order,
        startedAt: new Date(),
      },
      include: { exercise: true },
    });

    return NextResponse.json(workoutExercise, { status: 201 });
  } catch (error) {
    console.error("Failed to create workout exercise:", error);
    return NextResponse.json({ error: "Failed to create workout exercise" }, { status: 500 });
  }
}
