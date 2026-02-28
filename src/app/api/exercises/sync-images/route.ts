import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

interface ExerciseEntry {
  gifFile: string | null;
  imageUrl: string | null;
  muscleGroups: string;
}

const seedData: Record<string, { equipment: string; type: string }> = {
  "Situps - Decline": { equipment: "bench", type: "weight_reps" },
  "Situps": { equipment: "bodyweight", type: "weight_reps" },
  "Situps - Decline Weighted": { equipment: "bench", type: "weight_reps" },
  "Leg Press - 45 Sled": { equipment: "machine", type: "weight_reps" },
  "Hip Abduction": { equipment: "machine", type: "weight_reps" },
  "Hip Adduction": { equipment: "machine", type: "weight_reps" },
  "Dip": { equipment: "bodyweight,dip_station", type: "weight_reps" },
  "Barbell Shrug": { equipment: "barbell", type: "weight_reps" },
  "Cable Lateral Raise": { equipment: "cable", type: "weight_reps" },
  "Wrist Curl": { equipment: "barbell", type: "weight_reps" },
  "Cable Kickback": { equipment: "cable", type: "weight_reps" },
  "Good Morning": { equipment: "barbell", type: "weight_reps" },
  "Farmer's Walk": { equipment: "dumbbell", type: "time" },
  "Incline Barbell Bench Press": { equipment: "barbell,bench", type: "weight_reps" },
  "Cable Row": { equipment: "cable", type: "weight_reps" },
};

export async function POST() {
  try {
    const jsonPath = join(process.cwd(), "public", "gifs", "exercises.json");
    const exercises: Record<string, ExerciseEntry> = JSON.parse(
      readFileSync(jsonPath, "utf-8")
    );

    // Rename legacy exercise names
    const renames: Record<string, string> = {
      "Decline Sit-Up": "Situps - Decline",
    };
    for (const [oldName, newName] of Object.entries(renames)) {
      await prisma.exercise.updateMany({
        where: { name: oldName },
        data: { name: newName },
      });
    }

    const results: { updated: string[]; created: string[]; skipped: string[] } = {
      updated: [],
      created: [],
      skipped: [],
    };

    for (const [name, entry] of Object.entries(exercises)) {
      if (!entry.imageUrl) {
        results.skipped.push(name);
        continue;
      }

      const existing = await prisma.exercise.findFirst({ where: { name } });

      if (existing) {
        await prisma.exercise.updateMany({
          where: { name },
          data: { imageUrl: entry.imageUrl },
        });
        results.updated.push(name);
      } else {
        const seed = seedData[name];
        if (seed) {
          await prisma.exercise.create({
            data: {
              name,
              muscleGroups: entry.muscleGroups,
              equipment: seed.equipment,
              type: seed.type,
              imageUrl: entry.imageUrl,
              isCustom: false,
            },
          });
          results.created.push(name);
        } else {
          results.skipped.push(`${name} (no seed data)`);
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
