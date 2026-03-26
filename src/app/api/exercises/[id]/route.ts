import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { isAdminSessionUser } from "@/lib/access";
import { slugify } from "@/lib/slugify";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findExercise(idOrSlug: string) {
  if (UUID_RE.test(idOrSlug)) {
    return prisma.exercise.findUnique({ where: { id: idOrSlug } });
  }
  const all = await prisma.exercise.findMany();
  return all.find((e: { name: string }) => slugify(e.name) === idOrSlug) ?? null;
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
    const { error: authError, userId, session } = await requireAuth();
    if (authError) return authError;

    const { id: idOrSlug } = await params;
    const existing = await findExercise(idOrSlug);
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const isAdmin = isAdminSessionUser(session?.user);
    const ownsCustomExercise = existing.isCustom && existing.userId === userId;
    const canAdministerLibraryExercise = isAdmin && !existing.isCustom;

    if (!ownsCustomExercise && !canAdministerLibraryExercise) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
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
    const { error: authError, userId, session } = await requireAuth();
    if (authError) return authError;

    const { id: idOrSlug } = await params;
    const existing = await findExercise(idOrSlug);
    if (!existing) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const isAdmin = isAdminSessionUser(session?.user);
    const ownsCustomExercise = existing.isCustom && existing.userId === userId;
    const canAdministerLibraryExercise = isAdmin && !existing.isCustom;

    if (!ownsCustomExercise && !canAdministerLibraryExercise) {
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
