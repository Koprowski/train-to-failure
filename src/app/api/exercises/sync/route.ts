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

  // Get all existing non-custom exercises with their IDs for updates
  const existingExercises = await prisma.exercise.findMany({
    where: { isCustom: false },
    select: { id: true, name: true, imageUrl: true },
  });
  const existingByName = new Map(existingExercises.map((e: { id: string; name: string; imageUrl: string | null }) => [e.name, e]));

  // Insert missing exercises and update imageUrls for existing ones
  const added: string[] = [];
  const updated: string[] = [];
  for (const seed of SEED_EXERCISES) {
    const existing = existingByName.get(seed.name);
    if (!existing) {
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
    } else if (imageMap[seed.name] && existing.imageUrl !== imageMap[seed.name]) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: { imageUrl: imageMap[seed.name] },
      });
      updated.push(seed.name);
    }
  }

  return NextResponse.json({ added, updated, total: SEED_EXERCISES.length });
}
