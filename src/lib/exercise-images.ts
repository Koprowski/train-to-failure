import { join, extname } from "path";
import { slugify } from "@/lib/slugify";

export const EXERCISE_IMAGE_UPLOAD_URL_PREFIX = "/exercise-images/";
export const EXERCISE_IMAGE_UPLOAD_DIR = join(process.cwd(), "public", "exercise-images");
export const MAX_EXERCISE_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const ALLOWED_EXTENSIONS = new Set([".gif", ".jpg", ".jpeg", ".png", ".webp", ".avif"]);

export function hasUploadedExerciseImage(url?: string | null) {
  return Boolean(url?.startsWith(EXERCISE_IMAGE_UPLOAD_URL_PREFIX));
}

export function uploadedExerciseImagePathFromUrl(url?: string | null) {
  if (!url || !hasUploadedExerciseImage(url)) {
    return null;
  }

  const fileName = url.slice(EXERCISE_IMAGE_UPLOAD_URL_PREFIX.length);
  if (!fileName) {
    return null;
  }

  return join(EXERCISE_IMAGE_UPLOAD_DIR, fileName);
}

export function getExerciseImageExtension(fileName?: string | null, mimeType?: string | null) {
  const fromMime = mimeType ? MIME_TO_EXTENSION[mimeType] : null;
  const fromName = fileName ? extname(fileName).toLowerCase() : "";

  if (fromMime) {
    return fromMime;
  }

  if (ALLOWED_EXTENSIONS.has(fromName)) {
    return fromName;
  }

  return null;
}

export function buildExerciseImageFileName(exerciseName: string, extension: string) {
  return `${slugify(exerciseName)}-${Date.now()}${extension}`;
}
