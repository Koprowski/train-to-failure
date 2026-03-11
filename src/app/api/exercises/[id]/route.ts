import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { slugify } from "@/lib/slugify";
import { readFileSync } from "fs";
import { join } from "path";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findExercise(idOrSlug: string) {
  if (UUID_RE.test(idOrSlug)) {
    return prisma.exercise.findUnique({ where: { id: idOrSlug } });
  }
  const all = await prisma.exercise.findMany();
  return all.find((e: { name: string }) => slugify(e.name) === idOrSlug) ?? null;
}

let gifLookup: Record<string, string> | null = null;
function getGifLookup(): Record<string, string> {
  if (!gifLookup) {
    try {
      const data = JSON.parse(readFileSync(join(process.cwd(), "public", "gifs", "exercises.json"), "utf-8"));
      gifLookup = {};
      for (const [name, entry] of Object.entries(data)) {
        const e = entry as { imageUrl?: string };
        if (e.imageUrl) gifLookup[name] = e.imageUrl;
      }
    } catch {
      gifLookup = {};
    }
  }
  return gifLookup;
}

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id: idOrSlug } = await params;
    const found = await findExercise(idOrSlug);
    if (!found) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }
    if (found.isCustom && found.userId !== userId) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    let exercise = await prisma.exercise.findUnique({
      where: { id: found.id },
      include: {
        workoutSets: {
          include: { workout: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Auto-populate imageUrl from exercises.json if missing or outdated
    const lookup = getGifLookup();
    const gifUrl = lookup[exercise.name];
    if (gifUrl && exercise.imageUrl !== gifUrl) {
      await prisma.exercise.update({ where: { id: exercise.id }, data: { imageUrl: gifUrl } });
      exercise = { ...exercise, imageUrl: gifUrl };
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to fetch exercise:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id: idOrSlug } = await params;

    const existing = await findExercise(idOrSlug);
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }
    if (!existing.isCustom || existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Prevent non-owners from changing ownership fields
    delete body.userId;
    delete body.isCustom;

    const exercise = await prisma.exercise.update({
      where: { id: existing.id },
      data: body,
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to update exercise:", error);
    return NextResponse.json(
      { error: "Failed to update exercise" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId } = await requireAuth();
    if (authError) return authError;

    const { id: idOrSlug } = await params;

    // Verify ownership: only allow deleting exercises the user owns
    const existing = await findExercise(idOrSlug);
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }
    if (!existing.isCustom || existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.exercise.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete exercise:", error);
    return NextResponse.json(
      { error: "Failed to delete exercise" },
      { status: 500 }
    );
  }
}

