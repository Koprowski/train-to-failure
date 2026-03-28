"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DateTimePicker from "@/components/DateTimePicker";
import ExerciseProgressHistory, { type ExerciseHistoryEntry } from "@/components/ExerciseProgressHistory";
import { slugify } from "@/lib/slugify";

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
  rir: number | null;
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
  templateId: string | null;
  template: { id: string; name: string } | null;
}

interface HistoryEntry {
  date: string;
  workoutName: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
  totalReps: number;
  sets: { setNumber: number; weightLbs: number | null; reps: number | null }[];
}

function ExerciseProgress({ exerciseId }: { exerciseId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"estimated1RM" | "maxWeight" | "totalVolume" | "totalReps">("estimated1RM");

  useEffect(() => {
    fetch(`/api/stats?exerciseId=${exerciseId}`)
      .then((r) => r.json())
      .then((data) => {
        const h = data?.history ?? [];
        setHistory(h);
        const hasWeight = h.some((e: HistoryEntry) => e.maxWeight > 0);
        setChartMetric(hasWeight ? "estimated1RM" : "totalReps");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exerciseId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-gray-500 text-xs py-4 text-center">No previous sessions to show.</p>;
  }

  const hasWeightData = history.some((h) => h.maxWeight > 0);
  const chartLabel = chartMetric === "maxWeight" ? "Max Weight (lbs)" : chartMetric === "estimated1RM" ? "Est. 1RM (lbs)" : chartMetric === "totalVolume" ? "Total Volume (lbs)" : "Total Reps";
  const recent = history.slice().reverse().slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Mini chart */}
      {history.length >= 2 && (
        <div>
          <div className="flex gap-1.5 mb-2">
            {(["estimated1RM", "maxWeight", "totalVolume", "totalReps"] as const).map((metric) => {
              const isWeightMetric = metric !== "totalReps";
              const disabled = isWeightMetric && !hasWeightData;
              return (
                <button
                  key={metric}
                  onClick={() => !disabled && setChartMetric(metric)}
                  disabled={disabled}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    chartMetric === metric
                      ? "bg-emerald-500 text-white"
                      : disabled
                        ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {metric === "maxWeight" ? "Weight" : metric === "estimated1RM" ? "1RM" : metric === "totalVolume" ? "Vol" : "Reps"}
                </button>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={10}
                tickFormatter={(d) => {
                  const date = new Date(d + "T00:00:00");
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#6b7280" fontSize={10} width={40} domain={[(min: number) => Math.max(0, Math.floor(min * 0.9)), (max: number) => Math.ceil(max * 1.05)]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#d1d5db" }}
                formatter={(value: number | undefined) => [value ?? 0, chartLabel]}
              />
              <Line
                type="monotone"
                dataKey={chartMetric}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Recent Sessions</p>
        <div className="space-y-1.5">
          {recent.map((h) => (
            <div key={h.date} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{h.date}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">{h.sets.length} sets</span>
                <span className="text-gray-300">{h.totalReps} reps</span>
                {hasWeightData && <span className="text-emerald-500">{h.estimated1RM} 1RM</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Track edits to sets
interface SetEdits {
  weightLbs?: string;
  reps?: string;
  rir?: string;
  completed?: boolean;
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [syncingTemplate, setSyncingTemplate] = useState(false);
  const [templateSynced, setTemplateSynced] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingSet, setAddingSet] = useState<string | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<Set<string>>(new Set());
  const [favoriteWorkout, setFavoriteWorkout] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseHistoryEntry[]>>({});
  const [exerciseHistoryLoading, setExerciseHistoryLoading] = useState<Record<string, boolean>>({});
  const [expandedExerciseHistory, setExpandedExerciseHistory] = useState<Record<string, boolean>>({});
  const [lastAddedExerciseId, setLastAddedExerciseId] = useState<string | null>(null);
  const [lastAddedSetId, setLastAddedSetId] = useState<string | null>(null);
  const exerciseCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const weightInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Inline edit state
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDurationH, setEditDurationH] = useState("");
  const [editDurationM, setEditDurationM] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [setEdits, setSetEdits] = useState<Record<string, SetEdits>>({});


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
    Promise.all([
      fetch(`/api/workouts/${id}`).then((r) => r.json()),
      fetch("/api/exercises/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/workouts/${id}/favorite`).then((r) => r.ok ? r.json() : { favorited: false }).catch(() => ({ favorited: false })),
    ]).then(([data, favIds, favW]) => {
      setWorkout(data);
      initEditState(data);
      if (Array.isArray(favIds)) setFavoriteExerciseIds(new Set(favIds));
      setFavoriteWorkout(favW?.favorited ?? false);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, initEditState]);

  useEffect(() => {
    if (!workout || workout.sets.length === 0) return;

    const exerciseIds = Array.from(new Set(workout.sets.map((set) => set.exerciseId)));

    setExpandedExerciseHistory((prev) => {
      const next: Record<string, boolean> = {};
      for (const exerciseId of exerciseIds) {
        next[exerciseId] = prev[exerciseId] ?? true;
      }
      return next;
    });

    let cancelled = false;
    setExerciseHistoryLoading((prev) => {
      const next = { ...prev };
      for (const exerciseId of exerciseIds) {
        next[exerciseId] = true;
      }
      return next;
    });

    void Promise.all(
      exerciseIds.map(async (exerciseId) => {
        try {
          const res = await fetch(`/api/stats?exerciseId=${exerciseId}`);
          const data = res.ok ? await res.json() : null;
          return { exerciseId, history: Array.isArray(data?.history) ? data.history as ExerciseHistoryEntry[] : [] };
        } catch {
          return { exerciseId, history: [] as ExerciseHistoryEntry[] };
        }
      })
    ).then((results) => {
      if (cancelled) return;

      setExerciseHistory((prev) => {
        const next = { ...prev };
        for (const result of results) {
          next[result.exerciseId] = result.history;
        }
        return next;
      });

      setExerciseHistoryLoading((prev) => {
        const next = { ...prev };
        for (const result of results) {
          next[result.exerciseId] = false;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [workout]);

  useEffect(() => {
    if (!lastAddedExerciseId) return;
    const card = exerciseCardRefs.current[lastAddedExerciseId];
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const t = setTimeout(() => setLastAddedExerciseId(null), 2000);
    return () => clearTimeout(t);
  }, [lastAddedExerciseId]);

  useEffect(() => {
    if (!lastAddedSetId) return;
    weightInputRefs.current[lastAddedSetId]?.focus();
    setLastAddedSetId(null);
  }, [lastAddedSetId]);

  const toggleExerciseFavorite = async (exerciseId: string) => {
    setFavoriteExerciseIds((prev) => {
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
      setFavoriteExerciseIds((prev) => {
        const next = new Set(prev);
        if (next.has(exerciseId)) next.delete(exerciseId);
        else next.add(exerciseId);
        return next;
      });
    }
  };

  const toggleWorkoutFavorite = async () => {
    if (!workout) return;
    const newVal = !favoriteWorkout;
    setFavoriteWorkout(newVal);
    try {
      await fetch(`/api/workouts/${workout.id}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      setFavoriteWorkout(!newVal);
    }
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

  const updateSetEdit = (setId: string, field: keyof SetEdits, value: string | boolean) => {
    setSetEdits((prev) => {
      const existing = prev[setId] ?? {};
      return { ...prev, [setId]: { ...existing, [field]: value } };
    });
  };

  const getSetValue = (set: WorkoutSet, field: "weightLbs" | "reps" | "rir"): string => {
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
        const data: Record<string, number | boolean | null> = {};
        if (edits.weightLbs !== undefined) data.weightLbs = edits.weightLbs ? Number(edits.weightLbs) : null;
        if (edits.reps !== undefined) data.reps = edits.reps ? Number(edits.reps) : null;
        if (edits.rir !== undefined) data.rir = edits.rir ? Number(edits.rir) : null;
        if (edits.completed !== undefined) data.completed = edits.completed;
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
      const exercises = exerciseGroups.map((g, i) => {
        const workingSets = g.sets.filter((s) => s.setType === "working" || !s.setType);
        const firstSet = workingSets[0] ?? g.sets[0];
        const w = firstSet ? (setEdits[firstSet.id]?.weightLbs ?? (firstSet.weightLbs != null ? String(firstSet.weightLbs) : "")) : "";
        const r = firstSet ? (setEdits[firstSet.id]?.reps ?? (firstSet.reps != null ? String(firstSet.reps) : "")) : "";
        return {
          exerciseId: g.exercise.id,
          order: i + 1,
          sets: g.sets.length,
          defaultWeightLbs: w ? parseFloat(w) : null,
          defaultReps: r ? parseInt(r) : null,
        };
      });

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

  const syncToTemplate = async () => {
    if (!workout?.templateId || syncingTemplate) return;
    setSyncingTemplate(true);
    try {
      // For each exercise group, use the first completed working set's weight/reps as defaults
      const exercises = exerciseGroups.map((g, i) => {
        const workingSets = g.sets.filter((s) => s.setType === "working" || !s.setType);
        const firstSet = workingSets[0] ?? g.sets[0];
        const w = firstSet ? (setEdits[firstSet.id]?.weightLbs ?? (firstSet.weightLbs != null ? String(firstSet.weightLbs) : "")) : "";
        const r = firstSet ? (setEdits[firstSet.id]?.reps ?? (firstSet.reps != null ? String(firstSet.reps) : "")) : "";
        return {
          exerciseId: g.exercise.id,
          order: i + 1,
          sets: g.sets.length,
          defaultWeightLbs: w ? parseFloat(w) : null,
          defaultReps: r ? parseInt(r) : null,
        };
      });

      const res = await fetch(`/api/templates/${workout.templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercises }),
      });
      if (res.ok) {
        setTemplateSynced(true);
        setTimeout(() => setTemplateSynced(false), 3000);
      } else {
        alert("Failed to update template. Try again.");
      }
    } catch (err) {
      console.error("Failed to sync template:", err);
    } finally {
      setSyncingTemplate(false);
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
        const newSet = await res.json();
        setWorkout((prev) => prev ? { ...prev, sets: [...prev.sets, newSet] } : prev);
        setLastAddedSetId(newSet.id);
      }
    } catch (err) {
      console.error("Failed to add set:", err);
    } finally {
      setAddingSet(null);
    }
  };

  const deleteSet = async (setId: string) => {
    if (!workout) return;
    try {
      const res = await fetch(`/api/workouts/${workout.id}/sets/${setId}`, { method: "DELETE" });
      if (res.ok) {
        setWorkout((prev) => prev ? { ...prev, sets: prev.sets.filter((s) => s.id !== setId) } : prev);
        setSetEdits((prev) => {
          const next = { ...prev };
          delete next[setId];
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to delete set:", err);
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
        const newSet = await res.json();
        setWorkout((prev) => prev ? { ...prev, sets: [...prev.sets, newSet] } : prev);
        setLastAddedExerciseId(exerciseId);
      } else {
        console.error("Failed to add exercise:", await res.text());
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
  const toggleExerciseHistory = (exerciseId: string) => {
    setExpandedExerciseHistory((prev) => ({
      ...prev,
      [exerciseId]: !(prev[exerciseId] ?? true),
    }));
  };

  const allHistoryExpanded = exerciseGroups.every(({ exercise }) => expandedExerciseHistory[exercise.id] !== false);
  const toggleAllHistory = () => {
    const next: Record<string, boolean> = {};
    for (const { exercise } of exerciseGroups) {
      next[exercise.id] = !allHistoryExpanded;
    }
    setExpandedExerciseHistory(next);
  };

  const buildCurrentExerciseHistoryEntry = (sets: WorkoutSet[]): ExerciseHistoryEntry => {
    const normalizedSets = sets
      .map((set) => {
        const edits = setEdits[set.id];
        const weightLbs = edits?.weightLbs !== undefined ? (edits.weightLbs ? Number(edits.weightLbs) : null) : set.weightLbs;
        const reps = edits?.reps !== undefined ? (edits.reps ? Number(edits.reps) : null) : set.reps;
        const completed = edits?.completed ?? set.completed;
        return {
          setNumber: set.setNumber,
          weightLbs,
          reps,
          completed,
        };
      })
      .filter((set) => set.completed && set.reps !== null);

    let maxWeight = 0;
    let totalVolume = 0;
    let estimated1RM = 0;
    let totalReps = 0;
    let weightedSetTotal = 0;
    let weightedSetCount = 0;

    for (const set of normalizedSets) {
      const weight = set.weightLbs ?? 0;
      const reps = set.reps ?? 0;
      totalVolume += weight * reps;
      totalReps += reps;
      if (weight > maxWeight) maxWeight = weight;
      if (weight > 0) {
        weightedSetTotal += weight;
        weightedSetCount += 1;
      }
      const e1rm = weight > 0 ? (reps === 1 ? weight : weight * (1 + reps / 30)) : 0;
      if (e1rm > estimated1RM) estimated1RM = e1rm;
    }

    const sourceDate = editDate || workout.startedAt;
    const date = new Date(sourceDate).toISOString().split("T")[0];

    return {
      date,
      workoutName: editName || workout.name,
      maxWeight,
      averageWeight: weightedSetCount > 0 ? Math.round((weightedSetTotal / weightedSetCount) * 10) / 10 : 0,
      totalVolume,
      estimated1RM: Math.round(estimated1RM * 10) / 10,
      totalReps,
      sets: normalizedSets
        .map(({ setNumber, weightLbs, reps }) => ({ setNumber, weightLbs, reps }))
        .sort((a, b) => a.setNumber - b.setNumber),
    };
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
              onClick={() => setShowDatePicker(true)}
              className="text-gray-400 mt-1 whitespace-nowrap hover:text-emerald-400 transition-colors text-left"
            >
              {formatDateTime(editDate || workout.startedAt)}
            </button>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <button
              onClick={toggleWorkoutFavorite}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title={favoriteWorkout ? "Remove from favorite workouts" : "Add to favorite workouts"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={favoriteWorkout ? "#ef4444" : "none"} stroke={favoriteWorkout ? "#ef4444" : "currentColor"} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
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
      {workout.finishedAt && exerciseGroups.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={toggleAllHistory}
            className="text-xs text-gray-400 hover:text-emerald-400 transition-colors px-2 py-1"
          >
            {allHistoryExpanded ? "Collapse all history" : "Expand all history"}
          </button>
        </div>
      )}
      {exerciseGroups.map(({ exercise, sets }) => (
        <div
          key={exercise.id}
          ref={(el) => { exerciseCardRefs.current[exercise.id] = el; }}
          className={`bg-gray-900 border rounded-xl overflow-hidden transition-all duration-300 ${lastAddedExerciseId === exercise.id ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-gray-800"}`}
        >
          <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
            <div>
              <Link href={`/exercises/${slugify(exercise.name)}`} className="font-semibold text-white hover:text-emerald-500 transition-colors">
                {exercise.name}
              </Link>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{exercise.muscleGroups}</p>
            </div>
            <button
              onClick={() => toggleExerciseFavorite(exercise.id)}
              className="p-1.5 shrink-0"
              aria-label={favoriteExerciseIds.has(exercise.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={favoriteExerciseIds.has(exercise.id) ? "#ef4444" : "none"} stroke={favoriteExerciseIds.has(exercise.id) ? "#ef4444" : "currentColor"} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-800">
                  <th className="py-2 px-4 text-left">Set</th>
                  <th className="py-2 px-3 text-center">Weight</th>
                  <th className="py-2 px-3 text-right">Reps</th>
                  <th className="py-2 px-3 text-right">
                    <span className="group relative inline-flex items-center gap-1 cursor-help">
                      RIR
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 px-3 py-2 text-xs text-left font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                        Reps in Reserve (0-10). How many more reps you could do. 0 = failure.
                      </span>
                    </span>
                  </th>
                  <th className="py-2 px-3 text-center">Done</th>
                  <th className="py-2 px-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set) => (
                  <tr key={set.id} className={`group/row border-b border-gray-800/50 ${(setEdits[set.id]?.completed ?? set.completed) ? "" : "opacity-60"}`}>
                    <td className="py-2 px-4">
                      <span className="text-gray-300">{set.setNumber}</span>
                    </td>
                    <td className="py-1 px-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(getSetValue(set, "weightLbs")) || 0;
                            updateSetEdit(set.id, "weightLbs", String(Math.max(0, cur - 5)));
                          }}
                          className="w-7 h-7 shrink-0 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
                          title="-5 lbs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          ref={(el) => { weightInputRefs.current[set.id] = el; }}
                          value={getSetValue(set, "weightLbs")}
                          onChange={(e) => updateSetEdit(set.id, "weightLbs", e.target.value)}
                          placeholder="--"
                          className="w-14 bg-transparent border-b border-transparent focus:border-emerald-500 text-center text-white outline-none py-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseFloat(getSetValue(set, "weightLbs")) || 0;
                            updateSetEdit(set.id, "weightLbs", String(cur + 5));
                          }}
                          className="w-7 h-7 shrink-0 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors border border-gray-700"
                          title="+5 lbs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                      </div>
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
                        min="0"
                        max="10"
                        value={getSetValue(set, "rir")}
                        onChange={(e) => updateSetEdit(set.id, "rir", e.target.value)}
                        placeholder="--"
                        className="w-12 bg-transparent border-b border-transparent focus:border-emerald-500 text-right text-gray-400 outline-none py-1 px-1 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          const currentCompleted = setEdits[set.id]?.completed ?? set.completed;
                          updateSetEdit(set.id, "completed", !currentCompleted);
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          (setEdits[set.id]?.completed ?? set.completed)
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-gray-600 text-transparent hover:border-gray-500"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => deleteSet(set.id)}
                        className="text-transparent hover:text-red-400 group-hover/row:text-gray-600 transition-colors p-0.5"
                        title="Delete set"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
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
          {workout.finishedAt && (
            <div className="border-t border-gray-800 bg-gray-950/40">
              <button
                onClick={() => toggleExerciseHistory(exercise.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-900/60"
              >
                <div>
                  <p className="text-sm font-medium text-white">Progress History</p>
                  <p className="text-xs text-gray-500">Expanded by default for completed workouts.</p>
                </div>
                <svg
                  className={`h-4 w-4 text-gray-400 transition-transform ${expandedExerciseHistory[exercise.id] ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedExerciseHistory[exercise.id] && (
                <div className="px-4 pb-4">
                  {exerciseHistoryLoading[exercise.id] ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-500" />
                    </div>
                  ) : (
                    <ExerciseProgressHistory
                      history={[
                        ...(exerciseHistory[exercise.id] ?? []).filter((entry) => {
                          const currentDate = (editDate || workout.startedAt).slice(0, 10);
                          const currentWorkoutName = editName || workout.name;
                          return !(entry.date === currentDate && entry.workoutName === currentWorkoutName);
                        }),
                        buildCurrentExerciseHistoryEntry(sets),
                      ].sort((a, b) => a.date.localeCompare(b.date))}
                      compact
                      showSessionHistory={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Sync to existing template (if workout was created from one) */}
      {workout.templateId && workout.template && (
        <div className="flex justify-center pt-2">
          <button
            onClick={syncToTemplate}
            disabled={syncingTemplate || templateSynced}
            className={`text-sm transition-colors ${templateSynced ? "text-emerald-500" : "text-blue-400 hover:text-blue-300"} disabled:opacity-50`}
          >
            {templateSynced
              ? "✓ Template updated!"
              : syncingTemplate
              ? "Updating..."
              : `Update "${workout.template.name}" template with these numbers`}
          </button>
        </div>
      )}

      {/* Save As Template */}
      <div className="flex justify-center pt-2 pb-2">
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

      {/* Date edit modal */}
      {showDatePicker && (
        <DateTimePicker
          value={editDate ? new Date(editDate) : new Date(workout.startedAt)}
          onClose={() => setShowDatePicker(false)}
          onSave={(date) => {
            const pad = (n: number) => String(n).padStart(2, "0");
            setEditDate(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
            setShowDatePicker(false);
          }}
        />
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

