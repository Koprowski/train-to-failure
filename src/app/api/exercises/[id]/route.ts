import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: {
        workoutSets: {
          include: { workout: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to fetch exercise:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const body = await request.json();

    // Prevent non-owners from changing ownership fields
    delete body.userId;
    delete body.isCustom;

    const exercise = await prisma.exercise.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to update exercise:", error);
    return NextResponse.json(
      { error: "Failed to update exercise" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership: only allow deleting exercises the user owns
    const existing = await prisma.exercise.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete exercise:", error);
    return NextResponse.json(
      { error: "Failed to delete exercise" },
      { status: 500 }
    );
  }
}
