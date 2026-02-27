import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const muscleGroup = searchParams.get("muscleGroup");
    const equipment = searchParams.get("equipment");

    const where: Record<string, unknown> = {
      OR: [
        { isCustom: false },
        { userId },
      ],
    };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (muscleGroup) {
      where.muscleGroups = { contains: muscleGroup };
    }
    if (equipment) {
      where.equipment = { contains: equipment };
    }

    const exercises = await prisma.exercise.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Failed to fetch exercises:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercises" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { name, muscleGroups, equipment, type, instructions, videoUrl, links, isCustom } = body;

    if (!name || !muscleGroups || !equipment) {
      return NextResponse.json(
        { error: "name, muscleGroups, and equipment are required" },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroups,
        equipment,
        type: type ?? "weight_reps",
        instructions: instructions ?? null,
        videoUrl: videoUrl ?? null,
        links: links ?? null,
        isCustom: isCustom ?? true,
        userId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("Failed to create exercise:", error);
    return NextResponse.json(
      { error: "Failed to create exercise" },
      { status: 500 }
    );
  }
}
