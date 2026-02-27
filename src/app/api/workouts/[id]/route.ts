import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const workout = await prisma.workout.findFirst({
      where: { id, userId },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
        template: true,
      },
    });

    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Failed to fetch workout:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.workout.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    // If finishing the workout, calculate duration from startedAt
    if (body.finishedAt && !body.duration) {
      const finishedAt = new Date(body.finishedAt);
      const startedAt = new Date(existing.startedAt);
      body.duration = Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000);
    }

    const workout = await prisma.workout.update({
      where: { id },
      data: body,
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
        template: true,
      },
    });

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Failed to update workout:", error);
    return NextResponse.json(
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.workout.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    await prisma.workout.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workout:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
