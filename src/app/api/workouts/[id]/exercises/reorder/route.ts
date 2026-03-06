import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/workouts/[id]/exercises/reorder
// Body: { order: [workoutExerciseId1, workoutExerciseId2, ...] }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const workout = await prisma.workout.findFirst({ where: { id, userId } });
    if (!workout) {
      return NextResponse.json({ error: "Workout not found" }, { status: 404 });
    }

    const body = await request.json();
    const { order } = body as { order: string[] };

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array of workoutExercise IDs" }, { status: 400 });
    }

    // Update each exercise's order in a transaction
    await prisma.$transaction(
      order.map((weId, idx) =>
        prisma.workoutExercise.update({
          where: { id: weId },
          data: { order: idx },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder exercises:", error);
    return NextResponse.json({ error: "Failed to reorder exercises" }, { status: 500 });
  }
}
