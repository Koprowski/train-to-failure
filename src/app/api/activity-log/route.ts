import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// GET - fetch all sets (workout + standalone) for the user, chronologically
export async function GET(request: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: Record<string, unknown> = {
      OR: [
        { userId },
        { workout: { userId } },
      ],
    };
    if (exerciseId) {
      where.exerciseId = exerciseId;
    }

    const sets = await prisma.workoutSet.findMany({
      where,
      include: {
        exercise: true,
        workout: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Failed to fetch activity log:", error);
    return NextResponse.json({ error: "Failed to fetch activity log" }, { status: 500 });
  }
}
