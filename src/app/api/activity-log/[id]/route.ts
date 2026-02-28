import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify the set belongs to this user (directly or via workout)
    const set = await prisma.workoutSet.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workout: { userId } },
        ],
      },
    });

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await prisma.workoutSet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete set:", error);
    return NextResponse.json(
      { error: "Failed to delete set" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.workoutSet.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { workout: { userId } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const body = await request.json();
    const set = await prisma.workoutSet.update({
      where: { id },
      data: body,
      include: { exercise: true },
    });

    return NextResponse.json(set);
  } catch (error) {
    console.error("Failed to update set:", error);
    return NextResponse.json(
      { error: "Failed to update set" },
      { status: 500 }
    );
  }
}
