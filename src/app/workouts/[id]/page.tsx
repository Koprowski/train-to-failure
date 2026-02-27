"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
}

interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  setType: string;
  weightLbs: number | null;
  reps: number | null;
  timeSecs: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
  exercise: Exercise;
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

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkout(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Workout not found</p>
        <Link href="/workouts" className="text-emerald-500 hover:underline mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    );
  }

  // Group sets by exercise
  const exerciseGroups: { exercise: Exercise; sets: WorkoutSet[] }[] = [];
  const groupMap = new Map<string, { exercise: Exercise; sets: WorkoutSet[] }>();
  for (const set of workout.sets) {
    if (!groupMap.has(set.exerciseId)) {
      groupMap.set(set.exerciseId, { exercise: set.exercise, sets: [] });
    }
    groupMap.get(set.exerciseId)!.sets.push(set);
  }
  exerciseGroups.push(...groupMap.values());

  const saveAsTemplate = async () => {
    if (!workout || savingTemplate) return;
    setSavingTemplate(true);
    try {
      const exercises = exerciseGroups.map((g, i) => ({
        exerciseId: g.exercise.id,
        order: i + 1,
        sets: g.sets.length,
      }));

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workout.name, exercises }),
      });
      if (res.ok) setTemplateSaved(true);
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const openEdit = () => {
    setEditName(workout.name);
    setEditNotes(workout.notes ?? "");
    setEditing(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, notes: editNotes || null }),
      });
      if (res.ok) {
        setWorkout({ ...workout, name: editName, notes: editNotes || null });
        setEditing(false);
      }
    } catch (err) {
      console.error("Failed to update workout:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteWorkout = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, { method: "DELETE" });
      if (res.ok) router.push("/workouts");
    } catch (err) {
      console.error("Failed to delete workout:", err);
      setDeleting(false);
    }
  };

  const totalVolume = workout.sets.reduce((sum, s) => {
    if (s.weightLbs && s.reps && s.completed) return sum + s.weightLbs * s.reps;
    return sum;
  }, 0);

  const completedSets = workout.sets.filter((s) => s.completed).length;

  const setTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      warmup: "W",
      working: "",
      dropset: "D",
      failure: "F",
    };
    return labels[type] ?? "";
  };

  const setTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warmup: "text-yellow-500",
      dropset: "text-blue-500",
      failure: "text-red-500",
    };
    return colors[type] ?? "";
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/workouts" className="hover:text-white transition-colors">Workouts</Link>
        <span>/</span>
        <span className="text-white">{workout.name}</span>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{workout.name}</h1>
            <p className="text-gray-400 mt-1">{formatDate(workout.startedAt)} at {formatTime(workout.startedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {workout.finishedAt && (
              <>
                <button
                  onClick={saveAsTemplate}
                  disabled={savingTemplate || templateSaved}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Save as template"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Save Template
                </button>
                <button
                  onClick={() => router.push(`/workouts/new?duplicateFrom=${workout.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Duplicate workout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Repeat
                </button>
              </>
            )}
            <button
              onClick={openEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Edit workout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Delete workout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Duration</p>
            <p className="text-xl font-semibold mt-0.5">{formatDuration(workout.duration)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Volume</p>
            <p className="text-xl font-semibold mt-0.5">{totalVolume.toLocaleString()} <span className="text-sm text-gray-400">lbs</span></p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Sets</p>
            <p className="text-xl font-semibold mt-0.5">{completedSets} <span className="text-sm text-gray-400">/ {workout.sets.length}</span></p>
          </div>
        </div>

        {workout.notes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">{workout.notes}</p>
          </div>
        )}
      </div>

      {/* Exercise details */}
      {exerciseGroups.map(({ exercise, sets }) => (
        <div key={exercise.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/50">
            <Link href={`/exercises/${exercise.id}`} className="font-semibold text-white hover:text-emerald-500 transition-colors">
              {exercise.name}
            </Link>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{exercise.muscleGroups}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-800">
                  <th className="py-2 px-4 text-left">Set</th>
                  <th className="py-2 px-3 text-right">Weight</th>
                  <th className="py-2 px-3 text-right">Reps</th>
                  <th className="py-2 px-3 text-right">
                    <span className="group relative inline-flex items-center gap-1 cursor-help">
                      RPE
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 px-3 py-2 text-xs text-left font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                        Rate of Perceived Exertion (1-10). How hard the set felt, where 10 is max effort.
                      </span>
                    </span>
                  </th>
                  <th className="py-2 px-3 text-center">Done</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set) => (
                  <tr key={set.id} className={`border-b border-gray-800/50 ${set.completed ? "" : "opacity-50"}`}>
                    <td className="py-2 px-4">
                      <span className="text-gray-300">{set.setNumber}</span>
                      {setTypeLabel(set.setType) && (
                        <span className={`ml-1.5 text-xs font-medium ${setTypeColor(set.setType)}`}>
                          {setTypeLabel(set.setType)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      {set.weightLbs != null ? `${set.weightLbs} lbs` : "--"}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      {set.reps ?? (set.timeSecs ? `${set.timeSecs}s` : "--")}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">
                      {set.rpe ?? "--"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {set.completed ? (
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-600">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {exerciseGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No exercises logged in this workout</p>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit Workout</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit || !editName.trim()}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Workout</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete &ldquo;{workout.name}&rdquo;? This will remove all sets and cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
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
