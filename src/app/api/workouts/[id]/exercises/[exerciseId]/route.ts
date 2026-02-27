import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string; exerciseId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { id, exerciseId } = await params;

    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const existing = await prisma.workoutExercise.findFirst({
      where: { id: exerciseId, workoutId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Workout exercise not found" }, { status: 404 });
    }

    const body = await request.json();
    const { startedAt, finishedAt, duration, notes } = body;

    const data: Record<string, unknown> = {};
    if (startedAt !== undefined) data.startedAt = startedAt ? new Date(startedAt) : null;
    if (finishedAt !== undefined) data.finishedAt = finishedAt ? new Date(finishedAt) : null;
    if (duration !== undefined) data.duration = duration;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.workoutExercise.update({
      where: { id: exerciseId },
      data,
      include: { exercise: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update workout exercise:", error);
    return NextResponse.json({ error: "Failed to update workout exercise" }, { status: 500 });
  }
}
