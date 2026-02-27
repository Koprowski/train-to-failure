import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET() {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const metrics = await prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch body metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch body metrics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const { date, weightLbs, bodyFatPct, notes } = body;

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const metric = await prisma.bodyMetric.create({
      data: {
        date: new Date(date),
        weightLbs: weightLbs ?? null,
        bodyFatPct: bodyFatPct ?? null,
        notes: notes ?? null,
        userId,
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (error) {
    console.error("Failed to create body metric:", error);
    return NextResponse.json(
      { error: "Failed to create body metric" },
      { status: 500 }
    );
  }
}
