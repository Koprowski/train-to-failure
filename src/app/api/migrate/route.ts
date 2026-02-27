import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// One-time migration endpoint. Remove after running.
// Support both GET and POST so you can just visit the URL in a browser.
export async function GET() {
  return runMigration();
}

export async function POST() {
  return runMigration();
}

async function runMigration() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const results: string[] = [];

    // Check if WorkoutExercise table already exists
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "WorkoutExercise" LIMIT 1`);
      results.push("WorkoutExercise table already exists, skipping");
    } catch {
      // Table doesn't exist, create it
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "WorkoutExercise" (
          "id" TEXT NOT NULL,
          "workoutId" TEXT NOT NULL,
          "exerciseId" TEXT NOT NULL,
          "order" INTEGER NOT NULL,
          "startedAt" TIMESTAMP(3),
          "finishedAt" TIMESTAMP(3),
          "duration" INTEGER,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push("Created WorkoutExercise table");

      await prisma.$executeRawUnsafe(`CREATE INDEX "WorkoutExercise_workoutId_idx" ON "WorkoutExercise"("workoutId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId")`);
      results.push("Created WorkoutExercise indexes");

      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutId_fkey"
        FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey"
        FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `);
      results.push("Created WorkoutExercise foreign keys");
    }

    // Add isQuickLog to Workout
    try {
      await prisma.$queryRawUnsafe(`SELECT "isQuickLog" FROM "Workout" LIMIT 1`);
      results.push("isQuickLog column already exists, skipping");
    } catch {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Workout" ADD COLUMN "isQuickLog" BOOLEAN NOT NULL DEFAULT false`);
      results.push("Added isQuickLog to Workout");
    }

    // Add workoutExerciseId to WorkoutSet
    try {
      await prisma.$queryRawUnsafe(`SELECT "workoutExerciseId" FROM "WorkoutSet" LIMIT 1`);
      results.push("workoutExerciseId column already exists, skipping");
    } catch {
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkoutSet" ADD COLUMN "workoutExerciseId" TEXT`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "WorkoutSet_workoutExerciseId_idx" ON "WorkoutSet"("workoutExerciseId")`);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutExerciseId_fkey"
        FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `);
      results.push("Added workoutExerciseId to WorkoutSet");
    }

    // Add completedAt to WorkoutSet
    try {
      await prisma.$queryRawUnsafe(`SELECT "completedAt" FROM "WorkoutSet" LIMIT 1`);
      results.push("completedAt column already exists, skipping");
    } catch {
      await prisma.$executeRawUnsafe(`ALTER TABLE "WorkoutSet" ADD COLUMN "completedAt" TIMESTAMP(3)`);
      results.push("Added completedAt to WorkoutSet");
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
