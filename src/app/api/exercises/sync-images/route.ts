import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

interface ExerciseEntry {
  gifFile: string | null;
  imageUrl: string | null;
  muscleGroups: string;
}

export async function POST() {
  try {
    const jsonPath = join(process.cwd(), "public", "gifs", "exercises.json");
    const exercises: Record<string, ExerciseEntry> = JSON.parse(
      readFileSync(jsonPath, "utf-8")
    );

    const results: { updated: string[]; notFound: string[]; skipped: string[] } = {
      updated: [],
      notFound: [],
      skipped: [],
    };

    for (const [name, entry] of Object.entries(exercises)) {
      if (!entry.imageUrl) {
        results.skipped.push(name);
        continue;
      }

      const result = await prisma.exercise.updateMany({
        where: { name },
        data: { imageUrl: entry.imageUrl },
      });

      if (result.count > 0) {
        results.updated.push(name);
      } else {
        results.notFound.push(name);
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
