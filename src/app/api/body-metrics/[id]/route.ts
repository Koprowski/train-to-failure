import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.weightLbs !== undefined) data.weightLbs = body.weightLbs;
    if (body.bodyFatPct !== undefined) data.bodyFatPct = body.bodyFatPct;
    if (body.notes !== undefined) data.notes = body.notes;

    const metric = await prisma.bodyMetric.update({
      where: { id },
      data,
    });

    return NextResponse.json(metric);
  } catch (error) {
    console.error("Failed to update body metric:", error);
    return NextResponse.json(
      { error: "Failed to update body metric" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.bodyMetric.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete body metric:", error);
    return NextResponse.json(
      { error: "Failed to delete body metric" },
      { status: 500 }
    );
  }
}
