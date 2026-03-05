"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface WorkoutSet {
  id: string;
  exerciseId: string;
  weightLbs: number | null;
  reps: number | null;
  completed: boolean;
  exercise: { name: string };
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

function SwipeableCard({
  workout,
  onDelete,
  onRepeat,
  formatDuration,
  formatDate,
  formatTime,
  favoriteIds,
  toggleFavorite,
}: {
  workout: Workout;
  onDelete: () => void;
  onRepeat: () => void;
  formatDuration: (s: number | null) => string;
  formatDate: (d: string) => string;
  formatTime: (d: string) => string;
  favoriteIds: Set<string>;
  toggleFavorite: (exerciseId: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    locked: boolean;
    dismissed: boolean;
  } | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const isActive = !workout.finishedAt;
  const hasIncompleteSets = !isActive && workout.sets.some((s) => !s.completed);
  const uniqueExercises = (() => {
    const map = new Map<string, { id: string; name: string; sets: { weightLbs: number | null; reps: number | null }[] }>();
    for (const s of workout.sets) {
      if (!map.has(s.exerciseId)) {
        map.set(s.exerciseId, { id: s.exerciseId, name: s.exercise.name, sets: [] });
      }
      map.get(s.exerciseId)!.sets.push({ weightLbs: s.weightLbs, reps: s.reps });
    }
    return Array.from(map.values());
  })();
  const totalVolume = workout.sets.reduce((sum, s) => {
    if (s.weightLbs && s.reps) return sum + s.weightLbs * s.reps;
    return sum;
  }, 0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragState.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: false,
      dismissed: false,
    };
    setTransitioning(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    if (!ds || ds.dismissed) return;

    const dx = e.touches[0].clientX - ds.startX;
    const dy = e.touches[0].clientY - ds.startY;

    if (!ds.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        ds.dismissed = true;
        setOffsetX(0);
        return;
      }
      if (Math.abs(dx) > 10) {
        ds.locked = true;
      } else {
        return;
      }
    }

    e.preventDefault();
    setOffsetX(dx);
  }, []);

  const handleTouchEnd = useCallback(() => {
    const ds = dragState.current;
    dragState.current = null;

    if (!ds || ds.dismissed || !ds.locked) {
      setTransitioning(true);
      setOffsetX(0);
      return;
    }

    const threshold = 80;

    if (offsetX > threshold) {
      // Swipe right = delete
      setTransitioning(true);
      setOffsetX(300);
      setTimeout(() => onDelete(), 200);
    } else if (offsetX < -threshold) {
      // Swipe left = edit
      setTransitioning(true);
      setOffsetX(-300);
      setTimeout(() => {
        window.location.href = isActive ? `/workouts/new?resume=${workout.id}` : `/workouts/${workout.id}`;
      }, 200);
    } else {
      setTransitioning(true);
      setOffsetX(0);
    }
  }, [offsetX, onDelete, workout.id, isActive]);

  // Colors behind the card based on swipe direction
  const showDelete = offsetX > 20;
  const showEdit = offsetX < -20;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Background action indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-6 rounded-xl">
        <div className={`flex items-center gap-2 transition-opacity ${showDelete ? "opacity-100" : "opacity-0"}`}>
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-red-400 text-sm font-medium">Delete</span>
        </div>
        <div className={`flex items-center gap-2 transition-opacity ${showEdit ? "opacity-100" : "opacity-0"}`}>
          <span className="text-blue-400 text-sm font-medium">Edit</span>
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
      </div>

      {/* Swipeable card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: transitioning ? "transform 200ms ease-out" : "none",
        }}
      >
        <Link
          href={isActive ? `/workouts/new?resume=${workout.id}` : `/workouts/${workout.id}`}
          className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
          onClick={(e) => { if (Math.abs(offsetX) > 5) e.preventDefault(); }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{workout.name}</h3>
                {isActive && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                    In Progress
                  </span>
                )}
                {hasIncompleteSets && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                    Needs Review
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {formatDate(workout.startedAt)} at {formatTime(workout.startedAt)}
              </p>
            </div>
            <div className="flex items-start gap-2 shrink-0 ml-4">
              <div className="text-right">
                <p className="text-white font-medium">{formatDuration(workout.duration)}</p>
                <p className="text-gray-400 text-sm">{workout.sets.length} sets</p>
              </div>
              {/* Repeat button */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRepeat(); }}
                className="p-1.5 rounded text-gray-500 hover:text-emerald-400 transition-colors"
                title="Repeat workout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {uniqueExercises.slice(0, 5).map((ex) => (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(ex.id); }}
                    className="shrink-0"
                    aria-label={favoriteIds.has(ex.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={favoriteIds.has(ex.id) ? "#ef4444" : "none"} stroke={favoriteIds.has(ex.id) ? "#ef4444" : "currentColor"} strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  <span className="text-gray-300 truncate">{ex.name}</span>
                </div>
                {ex.sets.length > 0 && (
                  <div className="flex gap-2 shrink-0 ml-2">
                    {ex.sets.map((s, i) => (
                      <div key={i} className="text-center text-xs min-w-[32px]">
                        <p className="text-gray-300 font-medium">{s.weightLbs ?? "BW"}</p>
                        <p className="text-gray-300">{s.reps ?? 0}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {uniqueExercises.length > 5 && (
              <p className="text-xs text-gray-500">+{uniqueExercises.length - 5} more exercises</p>
            )}
          </div>
          {totalVolume > 0 && (
            <p className="text-gray-500 text-xs mt-2">
              Total volume: {totalVolume.toLocaleString()} lbs
            </p>
          )}
        </Link>
      </div>
    </div>
  );
}

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/exercises/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([data, favIds]) => {
      setWorkouts(Array.isArray(data) ? data : []);
      if (Array.isArray(favIds)) setFavoriteIds(new Set(favIds));
      setLoading(false);
    });
  }, []);

  const toggleFavorite = async (exerciseId: string) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId);
      else next.add(exerciseId);
      return next;
    });
    try {
      await fetch("/api/exercises/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId }),
      });
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(exerciseId)) next.delete(exerciseId);
        else next.add(exerciseId);
        return next;
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const deleteWorkout = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setWorkouts((prev) => prev.filter((w) => w.id !== deleteId));
        setDeleteId(null);
      }
    } catch (err) {
      console.error("Failed to delete workout:", err);
    } finally {
      setDeleting(false);
    }
  };

  const repeatWorkout = (workout: Workout) => {
    if (repeating) return;
    setRepeating(workout.id);
    router.push(`/workouts/new?duplicateFrom=${workout.id}`);
  };

  const workoutToDelete = deleteId ? workouts.find((w) => w.id === deleteId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Workout History</h1>
        <Link
          href="/workouts/new"
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workout
        </Link>
      </div>

      {workouts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-lg">No workouts logged yet</p>
          <p className="text-sm mt-1">Start your first workout to track your progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <SwipeableCard
              key={w.id}
              workout={w}
              onDelete={() => setDeleteId(w.id)}
              onRepeat={() => repeatWorkout(w)}
              formatDuration={formatDuration}
              formatDate={formatDate}
              formatTime={formatTime}
              favoriteIds={favoriteIds}
              toggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && workoutToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Workout</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete &ldquo;{workoutToDelete.name}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={deleteWorkout}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
