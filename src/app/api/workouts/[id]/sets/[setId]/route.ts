import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string; setId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, setId } = await params;
    const body = await request.json();

    // Verify the set belongs to this workout
    const existing = await prisma.workoutSet.findFirst({
      where: { id: setId, workoutId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const set = await prisma.workoutSet.update({
      where: { id: setId },
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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, setId } = await params;

    // Verify the set belongs to this workout
    const existing = await prisma.workoutSet.findFirst({
      where: { id: setId, workoutId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await prisma.workoutSet.delete({ where: { id: setId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete set:", error);
    return NextResponse.json(
      { error: "Failed to delete set" },
      { status: 500 }
    );
  }
}
