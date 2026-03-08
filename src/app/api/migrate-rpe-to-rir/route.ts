import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// POST /api/migrate-rpe-to-rir - one-time migration: convert RPE values to RIR (10 - RPE)
export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;

  // The DB column is still called "rpe" (via @map), so use raw SQL
  const result = await prisma.$executeRaw`
    UPDATE "WorkoutSet" SET rpe = 10 - rpe WHERE rpe IS NOT NULL
  `;

  return NextResponse.json({ migrated: result });
}
