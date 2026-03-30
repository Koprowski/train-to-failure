import { extname } from "path";
import { slugify } from "@/lib/slugify";

export const MAX_EXERCISE_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

// Returns true when the exercise has a user-uploaded image stored in Vercel Blob
// (as opposed to a seed/library URL from the exercise catalogue)
export function hasUploadedExerciseImage(url?: string | null) {
  return Boolean(url?.includes("blob.vercel-storage.com"));
}

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const ALLOWED_EXTENSIONS = new Set([".gif", ".jpg", ".jpeg", ".png", ".webp", ".avif"]);

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
  return `exercise-images/${slugify(exerciseName)}-${Date.now()}${extension}`;
}
