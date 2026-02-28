import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const workouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
        template: true,
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Failed to fetch workouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { name, templateId, notes, isQuickLog, startedAt } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const workout = await prisma.workout.create({
      data: {
        name,
        templateId: templateId ?? null,
        notes: notes ?? null,
        isQuickLog: isQuickLog ?? false,
        userId,
        ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
      },
      include: {
        sets: { include: { exercise: true } },
        template: true,
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    console.error("Failed to create workout:", error);
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
