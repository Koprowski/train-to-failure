import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.workoutTemplate.findMany({
      orderBy: { name: "asc" },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, folder, notes, exercises } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const template = await prisma.workoutTemplate.create({
      data: {
        name,
        folder: folder ?? null,
        notes: notes ?? null,
        exercises: exercises?.length
          ? {
              create: exercises.map(
                (ex: { exerciseId: string; order: number; sets?: number; supersetGroup?: number; notes?: string }) => ({
                  exerciseId: ex.exerciseId,
                  order: ex.order,
                  sets: ex.sets ?? 3,
                  supersetGroup: ex.supersetGroup ?? null,
                  notes: ex.notes ?? null,
                })
              ),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
