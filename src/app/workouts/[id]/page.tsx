"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
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

// Track edits to sets
interface SetEdits {
  weightLbs?: string;
  reps?: string;
  rpe?: string;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");

  // Inline edit state
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDurationH, setEditDurationH] = useState("");
  const [editDurationM, setEditDurationM] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [setEdits, setSetEdits] = useState<Record<string, SetEdits>>({});
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Track the "clean" state to detect changes
  const [cleanState, setCleanState] = useState<{ name: string; notes: string; date: string; durationH: string; durationM: string } | null>(null);

  const initEditState = useCallback((w: Workout) => {
    setEditName(w.name);
    setEditNotes(w.notes ?? "");
    const d = new Date(w.startedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setEditDate(dateVal);
    const durH = w.duration ? String(Math.floor(w.duration / 3600)) : "0";
    const durM = w.duration ? String(Math.floor((w.duration % 3600) / 60)) : "0";
    setEditDurationH(durH);
    setEditDurationM(durM);
    setCleanState({ name: w.name, notes: w.notes ?? "", date: dateVal, durationH: durH, durationM: durM });
    setSetEdits({});
  }, []);

  useEffect(() => {
    fetch(`/api/workouts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkout(data);
        initEditState(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, initEditState]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hour = d.getHours() % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "PM" : "AM";
    return `${weekday} ${mm}/${dd}/${yyyy} - ${hour}:${min}${ampm}`;
  };

  // Detect if anything has changed
  const hasWorkoutChanges = cleanState && (
    editName !== cleanState.name ||
    editNotes !== cleanState.notes ||
    editDate !== cleanState.date ||
    editDurationH !== cleanState.durationH ||
    editDurationM !== cleanState.durationM
  );
  const hasSetChanges = Object.keys(setEdits).length > 0;
  const hasChanges = hasWorkoutChanges || hasSetChanges;

  const updateSetEdit = (setId: string, field: keyof SetEdits, value: string) => {
    setSetEdits((prev) => {
      const existing = prev[setId] ?? {};
      return { ...prev, [setId]: { ...existing, [field]: value } };
    });
  };

  const getSetValue = (set: WorkoutSet, field: "weightLbs" | "reps" | "rpe"): string => {
    const edits = setEdits[set.id];
    if (edits && edits[field] !== undefined) return edits[field]!;
    const val = set[field];
    return val != null ? String(val) : "";
  };

  const saveAll = async () => {
    if (!workout || saving) return;
    setSaving(true);
    try {
      // Save workout-level changes
      if (hasWorkoutChanges) {
        const newStartedAt = new Date(editDate).toISOString();
        const newDuration = (parseInt(editDurationH) || 0) * 3600 + (parseInt(editDurationM) || 0) * 60;
        const updateData: Record<string, unknown> = {
          name: editName,
          notes: editNotes || null,
          startedAt: newStartedAt,
          duration: newDuration > 0 ? newDuration : null,
        };
        await fetch(`/api/workouts/${workout.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });
      }

      // Save set-level changes
      const setPromises = Object.entries(setEdits).map(([setId, edits]) => {
        const data: Record<string, number | null> = {};
        if (edits.weightLbs !== undefined) data.weightLbs = edits.weightLbs ? Number(edits.weightLbs) : null;
        if (edits.reps !== undefined) data.reps = edits.reps ? Number(edits.reps) : null;
        if (edits.rpe !== undefined) data.rpe = edits.rpe ? Number(edits.rpe) : null;
        return fetch(`/api/workouts/${workout.id}/sets/${setId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      });
      await Promise.all(setPromises);

      // Reload workout
      const res = await fetch(`/api/workouts/${workout.id}`);
      const updated = await res.json();
      setWorkout(updated);
      initEditState(updated);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
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
      if (res.ok) {
        setTemplateSaved(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(`Failed to save template: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error("Failed to save template:", err);
      alert("Failed to save template. Check your connection and try again.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const addSet = async (exerciseId: string) => {
    if (!workout || addingSet) return;
    setAddingSet(exerciseId);
    try {
      const res = await fetch(`/api/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, completed: true }),
      });
      if (res.ok) {
        // Reload workout to get updated sets
        const updated = await (await fetch(`/api/workouts/${workout.id}`)).json();
        setWorkout(updated);
        initEditState(updated);
      }
    } catch (err) {
      console.error("Failed to add set:", err);
    } finally {
      setAddingSet(null);
    }
  };

  const openExercisePicker = async () => {
    if (allExercises.length === 0) {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setAllExercises(Array.isArray(data) ? data : []);
    }
    setExerciseSearch("");
    setShowExercisePicker(true);
  };

  const addExercise = async (exerciseId: string) => {
    if (!workout) return;
    setShowExercisePicker(false);
    setAddingSet(exerciseId);
    try {
      const res = await fetch(`/api/workouts/${workout.id}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, completed: true }),
      });
      if (res.ok) {
        const updated = await (await fetch(`/api/workouts/${workout.id}`)).json();
        setWorkout(updated);
        initEditState(updated);
      }
    } catch (err) {
      console.error("Failed to add exercise:", err);
    } finally {
      setAddingSet(null);
    }
  };

  const filteredPickerExercises = allExercises.filter((ex) =>
    !exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

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
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none text-white w-full truncate focus:ring-0 p-0"
              placeholder="Workout name"
            />
            <button
              onClick={() => {
                setShowDatePicker(true);
                setTimeout(() => dateInputRef.current?.showPicker?.(), 50);
              }}
              className="text-gray-400 mt-1 whitespace-nowrap hover:text-emerald-400 transition-colors text-left"
            >
              {formatDateTime(editDate || workout.startedAt)}
            </button>
            {showDatePicker && (
              <input
                ref={dateInputRef}
                type="datetime-local"
                value={editDate}
                onChange={(e) => { setEditDate(e.target.value); setShowDatePicker(false); }}
                onBlur={() => setShowDatePicker(false)}
                className="block mt-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                autoFocus
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            {/* Save button -- only visible when changes exist */}
            {hasChanges && (
              <button
                onClick={saveAll}
                disabled={saving}
                className="group relative p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                title="Save changes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v4h8V3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14h10v7H7z" />
                </svg>
                <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded whitespace-nowrap z-10">
                  {saving ? "Saving..." : "Save changes"}
                </span>
              </button>
            )}
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
        {workout.finishedAt && (
          <div className="flex justify-center mt-3">
            <button
              onClick={() => router.push(`/workouts/new?duplicateFrom=${workout.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
              title="Duplicate workout"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Repeat Workout
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Duration</p>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={editDurationH}
                onChange={(e) => setEditDurationH(e.target.value)}
                className="w-8 bg-transparent text-xl font-semibold text-white outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-emerald-500"
              />
              <span className="text-sm text-gray-400">h</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                value={editDurationM}
                onChange={(e) => setEditDurationM(e.target.value)}
                className="w-8 bg-transparent text-xl font-semibold text-white outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none border-b border-transparent focus:border-emerald-500"
              />
              <span className="text-sm text-gray-400">m</span>
            </div>
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

        <div className="mt-4 pt-4 border-t border-gray-800">
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={1}
            placeholder="Add notes..."
            className="w-full bg-transparent border-none outline-none text-sm text-gray-400 focus:text-white resize-none p-0 placeholder-gray-600"
          />
        </div>
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
                    <td className="py-1 px-1 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={getSetValue(set, "weightLbs")}
                        onChange={(e) => updateSetEdit(set.id, "weightLbs", e.target.value)}
                        placeholder="--"
                        className="w-16 bg-transparent border-b border-transparent focus:border-emerald-500 text-right text-white outline-none py-1 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="py-1 px-1 text-right">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={getSetValue(set, "reps")}
                        onChange={(e) => updateSetEdit(set.id, "reps", e.target.value)}
                        placeholder="--"
                        className="w-12 bg-transparent border-b border-transparent focus:border-emerald-500 text-right text-white outline-none py-1 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="py-1 px-1 text-right">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="1"
                        max="10"
                        value={getSetValue(set, "rpe")}
                        onChange={(e) => updateSetEdit(set.id, "rpe", e.target.value)}
                        placeholder="--"
                        className="w-12 bg-transparent border-b border-transparent focus:border-emerald-500 text-right text-gray-400 outline-none py-1 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
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
          <button
            onClick={() => addSet(exercise.id)}
            disabled={addingSet === exercise.id}
            className="w-full py-2 text-xs text-gray-500 hover:text-emerald-400 hover:bg-gray-800/50 transition-colors disabled:opacity-50 border-t border-gray-800/50"
          >
            {addingSet === exercise.id ? "Adding..." : "+ Add Set"}
          </button>
        </div>
      ))}

      {exerciseGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No exercises logged in this workout</p>
        </div>
      )}

      {/* Add Exercise */}
      <button
        onClick={openExercisePicker}
        className="w-full py-3 border border-dashed border-gray-700 rounded-xl text-gray-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors text-sm"
      >
        + Add Exercise
      </button>

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Add Exercise</h2>
                <button onClick={() => setShowExercisePicker(false)} className="text-gray-400 hover:text-white p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredPickerExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <p className="text-sm text-white">{ex.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{ex.muscleGroups}</p>
                </button>
              ))}
              {filteredPickerExercises.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No exercises found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save As Template */}
      <div className="flex justify-center pt-4 pb-2">
        <button
          onClick={saveAsTemplate}
          disabled={savingTemplate || templateSaved}
          className={`text-sm transition-colors ${templateSaved ? "text-emerald-500" : "text-gray-500 hover:text-white"} disabled:opacity-50`}
        >
          {templateSaved ? "Template Saved!" : savingTemplate ? "Saving..." : "Save Workout As Template"}
        </button>
      </div>

      {/* Floating save bar when changes exist */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-center z-40">
          <button
            onClick={saveAll}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v4h8V3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14h10v7H7z" />
            </svg>
            {saving ? "Saving..." : "Save Changes"}
          </button>
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
