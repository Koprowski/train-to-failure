import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { mkdir, unlink, writeFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { canUploadExerciseImageSessionUser, isAdminSessionUser } from "@/lib/access";
import {
  buildExerciseImageFileName,
  EXERCISE_IMAGE_UPLOAD_DIR,
  EXERCISE_IMAGE_UPLOAD_URL_PREFIX,
  getExerciseImageExtension,
  MAX_EXERCISE_IMAGE_SIZE_BYTES,
  uploadedExerciseImagePathFromUrl,
} from "@/lib/exercise-images";
import { slugify } from "@/lib/slugify";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ id: string }> };

async function findExercise(idOrSlug: string) {
  if (UUID_RE.test(idOrSlug)) {
    return prisma.exercise.findUnique({ where: { id: idOrSlug } });
  }

  const all = await prisma.exercise.findMany();
  return all.find((exercise: { name: string }) => slugify(exercise.name) === idOrSlug) ?? null;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { error: authError, userId, session } = await requireAuth();
    if (authError) return authError;

    if (!canUploadExerciseImageSessionUser(session?.user)) {
      return NextResponse.json({ error: "Image uploads are only available to admins and paid users." }, { status: 403 });
    }

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

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
    }

    if (file.size > MAX_EXERCISE_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: "The selected file is too large." }, { status: 400 });
    }

    const extension = getExerciseImageExtension(file.name, file.type);
    if (!extension) {
      return NextResponse.json({ error: "Please select a GIF, PNG, JPG, WEBP, or AVIF image." }, { status: 400 });
    }

    await mkdir(EXERCISE_IMAGE_UPLOAD_DIR, { recursive: true });
    const fileName = buildExerciseImageFileName(existing.name, extension);
    const filePath = join(EXERCISE_IMAGE_UPLOAD_DIR, fileName);
    const publicUrl = `${EXERCISE_IMAGE_UPLOAD_URL_PREFIX}${fileName}`;
    const oldUploadedPath = uploadedExerciseImagePathFromUrl(existing.imageUrl);

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, bytes);

    const updated = await prisma.exercise.update({
      where: { id: existing.id },
      data: { imageUrl: publicUrl },
    });

    if (oldUploadedPath && oldUploadedPath !== filePath) {
      await unlink(oldUploadedPath).catch(() => undefined);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to upload exercise image:", error);
    return NextResponse.json(
      { error: "Failed to upload exercise image" },
      { status: 500 }
    );
  }
}

