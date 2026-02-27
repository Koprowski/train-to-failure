import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface ExerciseEntry {
  gifFile: string | null;
  imageUrl: string | null;
  muscleGroups: string;
}

async function main() {
  const jsonPath = join(process.cwd(), "public", "gifs", "exercises.json");
  const exercises: Record<string, ExerciseEntry> = JSON.parse(
    readFileSync(jsonPath, "utf-8")
  );

  let updated = 0;
  let skipped = 0;

  for (const [name, entry] of Object.entries(exercises)) {
    if (!entry.imageUrl) {
      console.log(`  - ${name} (no GIF available)`);
      skipped++;
      continue;
    }

    const result = await prisma.exercise.updateMany({
      where: { name },
      data: { imageUrl: entry.imageUrl },
    });

    if (result.count > 0) {
      console.log(`  ✓ ${name}`);
      updated += result.count;
    } else {
      console.log(`  ✗ ${name} (not found in database)`);
    }
  }

  console.log(`\nUpdated: ${updated} | Skipped (no GIF): ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
