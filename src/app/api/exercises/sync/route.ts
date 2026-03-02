import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { SEED_EXERCISES } from "@/lib/seed-exercises";
import { readFileSync } from "fs";
import { join } from "path";

// POST /api/exercises/sync - add any missing seed exercises
export async function POST() {
  const { error } = await requireAuth();
  if (error) return error;

  // Load image URLs from exercises.json
  let imageMap: Record<string, string> = {};
  try {
    const jsonPath = join(process.cwd(), "public", "gifs", "exercises.json");
    const data: Record<string, { imageUrl?: string }> = JSON.parse(
      readFileSync(jsonPath, "utf-8")
    );
    for (const [name, entry] of Object.entries(data)) {
      if (entry.imageUrl) imageMap[name] = entry.imageUrl;
    }
  } catch {
    // exercises.json may not exist in all environments
  }

  // Get all existing non-custom exercise names
  const existing = await prisma.exercise.findMany({
    where: { isCustom: false },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));

  // Insert missing exercises
  const added: string[] = [];
  for (const seed of SEED_EXERCISES) {
    if (!existingNames.has(seed.name)) {
      await prisma.exercise.create({
        data: {
          name: seed.name,
          muscleGroups: seed.muscleGroups,
          equipment: seed.equipment,
          type: seed.type,
          videoUrl: seed.videoUrl ?? null,
          imageUrl: imageMap[seed.name] ?? null,
          isCustom: false,
        },
      });
      added.push(seed.name);
    }
  }

  return NextResponse.json({ added, total: SEED_EXERCISES.length });
}
