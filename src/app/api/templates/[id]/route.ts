import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, folder, notes, exercises } = body;

    // If exercises are provided, replace them all
    if (exercises) {
      await prisma.templateExercise.deleteMany({ where: { templateId: id } });
    }

    const template = await prisma.workoutTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(folder !== undefined && { folder }),
        ...(notes !== undefined && { notes }),
        ...(exercises && {
          exercises: {
            create: exercises.map(
              (ex: { exerciseId: string; order: number; sets?: number; supersetGroup?: number; notes?: string }) => ({
                exerciseId: ex.exerciseId,
                order: ex.order,
                sets: ex.sets ?? 3,
                supersetGroup: ex.supersetGroup ?? null,
                notes: ex.notes ?? null,
              })
            ),
          },
        }),
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.workoutTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
