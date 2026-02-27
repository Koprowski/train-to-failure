"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface WorkoutSet {
  id: string;
  exerciseId: string;
  weightLbs: number | null;
  reps: number | null;
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

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/workouts")
      .then((r) => r.json())
      .then((data) => {
        setWorkouts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
          {workouts.map((w) => {
            const uniqueExercises = [...new Set(w.sets.map((s) => s.exercise.name))];
            const totalVolume = w.sets.reduce((sum, s) => {
              if (s.weightLbs && s.reps) return sum + s.weightLbs * s.reps;
              return sum;
            }, 0);
            const isActive = !w.finishedAt;

            return (
              <Link
                key={w.id}
                href={isActive ? `/workouts/new?resume=${w.id}` : `/workouts/${w.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{w.name}</h3>
                      {isActive && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                          In Progress
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      {formatDate(w.startedAt)} at {formatTime(w.startedAt)}
                    </p>
                  </div>
                  <div className="flex items-start gap-3 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-white font-medium">{formatDuration(w.duration)}</p>
                      <p className="text-gray-400 text-sm">{w.sets.length} sets</p>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(w.id); }}
                      className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
                      title="Delete workout"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {uniqueExercises.slice(0, 5).map((name) => (
                    <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                      {name}
                    </span>
                  ))}
                  {uniqueExercises.length > 5 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                      +{uniqueExercises.length - 5} more
                    </span>
                  )}
                </div>
                {totalVolume > 0 && (
                  <p className="text-gray-500 text-xs mt-2">
                    Total volume: {totalVolume.toLocaleString()} lbs
                  </p>
                )}
              </Link>
            );
          })}
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
