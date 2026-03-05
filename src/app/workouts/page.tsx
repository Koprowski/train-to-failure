"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const Body = dynamic(
  () => import("react-muscle-highlighter"),
  { ssr: false }
);

interface WorkoutSet {
  id: string;
  exerciseId: string;
  weightLbs: number | null;
  reps: number | null;
  completed: boolean;
  exercise: { name: string; muscleGroups?: string };
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

// Map react-muscle-highlighter slugs to app muscle group names
const SLUG_TO_MUSCLE: Record<string, string[]> = {
  abs: ["abs"],
  adductors: ["adductors", "hip flexors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  deltoids: ["shoulders"],
  forearm: ["forearms"],
  gluteal: ["glutes", "abductors"],
  hamstring: ["hamstrings"],
  obliques: ["obliques"],
  quadriceps: ["quads", "hip flexors"],
  trapezius: ["traps"],
  triceps: ["triceps"],
  "upper-back": ["back", "lats"],
  "lower-back": ["back"],
};

// Reverse map: app muscle group -> highlight slugs
const MUSCLE_TO_SLUGS: Record<string, string[]> = {};
for (const [slug, muscles] of Object.entries(SLUG_TO_MUSCLE)) {
  for (const m of muscles) {
    if (!MUSCLE_TO_SLUGS[m]) MUSCLE_TO_SLUGS[m] = [];
    if (!MUSCLE_TO_SLUGS[m].includes(slug)) MUSCLE_TO_SLUGS[m].push(slug);
  }
}

// Muscle label positions: [side, labelTopPercent, muscleName, bodyX%, bodyY%]
// bodyX/bodyY are percentages of the BODY SVG itself (not the container).
// A useEffect measures the actual SVG bounding box and maps these to container coords.
const FRONT_LABELS: [string, number, string, number, number][] = [
  ["left", 10, "traps",       45, 20],
  ["left", 20, "shoulders",   18, 23],
  ["left", 30, "chest",       35, 30],
  ["left", 38, "biceps",      12, 37],
  ["left", 46, "obliques",    32, 44],
  ["left", 62, "quads",       38, 64],
  ["right", 30, "abs",        50, 37],
  ["right", 38, "forearms",   83, 46],
  ["right", 50, "hip flexors",58, 52],
  ["right", 62, "adductors",  48, 59],
  ["right", 78, "calves",     58, 80],
];

const BACK_LABELS: [string, number, string, number, number][] = [
  ["left", 10, "traps",       45, 20],
  ["left", 20, "shoulders",   18, 23],
  ["left", 30, "back",        50, 30],
  ["left", 40, "lats",        28, 36],
  ["left", 52, "glutes",      45, 50],
  ["left", 65, "hamstrings",  42, 65],
  ["right", 30, "triceps",    82, 34],
  ["right", 40, "forearms",   85, 46],
  ["right", 52, "abductors",  60, 50],
  ["right", 78, "calves",     58, 80],
];

function properCase(s: string) {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function SwipeableCard({
  workout,
  onDelete,
  onRepeat,
  formatDate,
  formatTime,
  favoriteIds,
  toggleFavorite,
  isWorkoutFavorited,
  onToggleWorkoutFavorite,
}: {
  workout: Workout;
  onDelete: () => void;
  onRepeat: () => void;
  formatDate: (d: string) => string;
  formatTime: (d: string) => string;
  favoriteIds: Set<string>;
  toggleFavorite: (exerciseId: string) => void;
  isWorkoutFavorited: boolean;
  onToggleWorkoutFavorite: () => void;
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
      setTransitioning(true);
      setOffsetX(300);
      setTimeout(() => onDelete(), 200);
    } else if (offsetX < -threshold) {
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

  const showDelete = offsetX > 20;
  const showEdit = offsetX < -20;

  return (
    <div className="relative overflow-hidden rounded-xl">
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
              {/* Workout favorite heart */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleWorkoutFavorite(); }}
                className="p-1.5 rounded transition-colors"
                title={isWorkoutFavorited ? "Remove workout from favorites" : "Add workout to favorites"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isWorkoutFavorited ? "#ef4444" : "none"} stroke={isWorkoutFavorited ? "#ef4444" : "currentColor"} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </button>
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

type SortMode = "date" | "favorites";

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [repeating, setRepeating] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritedWorkoutNames, setFavoritedWorkoutNames] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [muscleFilter, setMuscleFilter] = useState<string[]>([]);
  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [muscleDraft, setMuscleDraft] = useState<string[]>([]);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  // Refs + state for measuring body SVG position within the diagram container
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const bodyDivRef = useRef<HTMLDivElement>(null);
  // bodyPos: actual body SVG bounding box as % of the diagram container
  const [bodyPos, setBodyPos] = useState({ left: 28, top: 0, width: 44, height: 100 });

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/exercises/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/workouts/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([data, favIds, favWorkouts]) => {
      setWorkouts(Array.isArray(data) ? data : []);
      if (Array.isArray(favIds)) setFavoriteIds(new Set(favIds));
      if (Array.isArray(favWorkouts)) {
        setFavoritedWorkoutNames(new Set(favWorkouts.map((fw: { name: string }) => fw.name)));
      }
      setLoading(false);
    });
  }, []);

  // Measure body SVG position within the diagram container
  useEffect(() => {
    if (!showMusclePicker) return;
    const measure = () => {
      const container = diagramContainerRef.current;
      const bodyDiv = bodyDivRef.current;
      if (!container || !bodyDiv) return;
      const cRect = container.getBoundingClientRect();
      if (cRect.width === 0 || cRect.height === 0) return;
      const svg = bodyDiv.querySelector("svg");
      if (!svg) return;
      const sRect = svg.getBoundingClientRect();
      setBodyPos({
        left: ((sRect.left - cRect.left) / cRect.width) * 100,
        top: ((sRect.top - cRect.top) / cRect.height) * 100,
        width: (sRect.width / cRect.width) * 100,
        height: (sRect.height / cRect.height) * 100,
      });
    };
    // Allow Body component time to render
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 400);
    const observer = new ResizeObserver(() => measure());
    if (diagramContainerRef.current) observer.observe(diagramContainerRef.current);
    return () => { clearTimeout(t1); clearTimeout(t2); observer.disconnect(); };
  }, [showMusclePicker, bodySide]);

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

  const toggleWorkoutFavorite = async (workout: Workout) => {
    const wasFavorited = favoritedWorkoutNames.has(workout.name);
    setFavoritedWorkoutNames((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(workout.name);
      else next.add(workout.name);
      return next;
    });
    try {
      await fetch(`/api/workouts/${workout.id}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      setFavoritedWorkoutNames((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(workout.name);
        else next.delete(workout.name);
        return next;
      });
    }
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

  // Filter and sort workouts
  const filteredWorkouts = useMemo(() => {
    let list = [...workouts];

    // Muscle group filter
    if (muscleFilter.length > 0) {
      list = list.filter((w) => {
        const workoutMuscles = new Set<string>();
        for (const s of w.sets) {
          if (s.exercise.muscleGroups) {
            s.exercise.muscleGroups.split(",").forEach((mg) => workoutMuscles.add(mg.trim().toLowerCase()));
          }
        }
        return muscleFilter.some((f) => workoutMuscles.has(f.toLowerCase()));
      });
    }

    // Sort
    if (sortMode === "favorites") {
      // Favorited workouts first, then by date
      list.sort((a, b) => {
        const aFav = favoritedWorkoutNames.has(a.name) ? 1 : 0;
        const bFav = favoritedWorkoutNames.has(b.name) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
    } else {
      list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    }

    return list;
  }, [workouts, sortMode, muscleFilter, favoritedWorkoutNames]);

  const onBodyPartPress = useCallback((part: { slug?: string }) => {
    if (!part.slug) return;
    const muscles = SLUG_TO_MUSCLE[part.slug];
    if (!muscles) return;
    const target = muscles[0];
    setMuscleDraft((prev) =>
      prev.includes(target) ? prev.filter((m) => m !== target) : [...prev, target]
    );
  }, []);

  const bodyMapElement = useMemo(() => (
    <Body
      side={bodySide}
      gender="male"
      scale={1.0}
      border="#4b5563"
      defaultFill="#1f2937"
      colors={["#10b981", "#34d399"]}
      data={
        muscleDraft.length > 0
          ? muscleDraft.flatMap((m) => (MUSCLE_TO_SLUGS[m] || []).map((slug) => ({ slug: slug as never, intensity: 2 })))
          : []
      }
      onBodyPartPress={onBodyPartPress}
    />
  ), [bodySide, muscleDraft, onBodyPartPress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Title + New Workout inline */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout History</h1>
        <Link
          href="/workouts/new"
          className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </Link>
      </div>

      {/* Slicer row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSortMode("date")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            sortMode === "date" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Date
        </button>
        <button
          onClick={() => setSortMode("favorites")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
            sortMode === "favorites" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={sortMode === "favorites" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          Favorites
        </button>
        <button
          onClick={() => { setMuscleDraft([...muscleFilter]); setShowMusclePicker(true); }}
          className={`relative px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
            muscleFilter.length > 0 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" />
            <path d="M15 14a5 5 0 0 0-7.584 2" />
            <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" />
          </svg>
          Muscle
          {muscleFilter.length > 0 && (
            <span className="w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{muscleFilter.length}</span>
          )}
        </button>
      </div>

      {/* Active muscle filters display */}
      {muscleFilter.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {muscleFilter.map((m) => (
            <button
              key={m}
              onClick={() => setMuscleFilter((prev) => prev.filter((x) => x !== m))}
              className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1"
            >
              {m}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
          <button
            onClick={() => setMuscleFilter([])}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {filteredWorkouts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-lg">{workouts.length === 0 ? "No workouts logged yet" : "No workouts match filters"}</p>
          <p className="text-sm mt-1">{workouts.length === 0 ? "Start your first workout to track your progress" : "Try adjusting your filters"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkouts.map((w) => (
            <SwipeableCard
              key={w.id}
              workout={w}
              onDelete={() => setDeleteId(w.id)}
              onRepeat={() => repeatWorkout(w)}
              formatDate={formatDate}
              formatTime={formatTime}
              favoriteIds={favoriteIds}
              toggleFavorite={toggleFavorite}
              isWorkoutFavorited={favoritedWorkoutNames.has(w.name)}
              onToggleWorkoutFavorite={() => toggleWorkoutFavorite(w)}
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

      {/* Muscle Group Picker Modal */}
      {showMusclePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMusclePicker(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-3" onClick={(e) => e.stopPropagation()}>
            {/* Title + Front/Back toggle + close in one row */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white">Muscle Group</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBodySide("front")}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${bodySide === "front" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  Front
                </button>
                <button
                  onClick={() => setBodySide("back")}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${bodySide === "back" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  Back
                </button>
                <button onClick={() => setShowMusclePicker(false)} className="text-gray-400 hover:text-white transition-colors ml-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body diagram with labeled lines */}
            <div ref={diagramContainerRef} className="relative mx-auto" style={{ width: "100%", maxWidth: "22rem", height: "20rem" }}>
              {/* SVG connecting lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS).map(([side, labelTop, muscle, muscleX, muscleY]) => {
                  const active = muscleDraft.includes(muscle);
                  // Label edge: left labels end near body left, right labels start near body right
                  const labelEdgeX = side === "left" ? bodyPos.left : bodyPos.left + bodyPos.width;
                  // Map muscle coords from body-SVG-relative to container-relative
                  const targetX = bodyPos.left + (muscleX / 100) * bodyPos.width;
                  const targetY = bodyPos.top + (muscleY / 100) * bodyPos.height;
                  return (
                    <line
                      key={`${side}-${muscle}`}
                      x1={`${labelEdgeX}%`}
                      y1={`${labelTop}%`}
                      x2={`${targetX}%`}
                      y2={`${targetY}%`}
                      stroke={active ? "#3b82f6" : "#374151"}
                      strokeWidth={active ? 1.5 : 0.75}
                      strokeDasharray={active ? "none" : "3 2"}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </svg>

              {/* Left labels */}
              <div className="absolute left-0 top-0 bottom-0 z-30" style={{ width: `${bodyPos.left}%` }}>
                {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS)
                  .filter(([side]) => side === "left")
                  .map(([, top, muscle]) => {
                    const active = muscleDraft.includes(muscle);
                    return (
                      <button
                        key={muscle}
                        onClick={() =>
                          setMuscleDraft((prev) =>
                            prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                          )
                        }
                        className={`absolute right-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                          active ? "text-blue-400" : "text-white/70 hover:text-white"
                        }`}
                        style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                      >
                        <span className={`px-1.5 py-0.5 rounded ${active ? "bg-blue-500/20 border border-blue-500/40" : "bg-gray-800/80"}`}>
                          {properCase(muscle)}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Body diagram (centered) */}
              <div ref={bodyDivRef} className="absolute" style={{ left: "20%", right: "20%", top: 0, bottom: 0, display: "flex", justifyContent: "center" }}>
                {bodyMapElement}
              </div>

              {/* Right labels */}
              <div className="absolute right-0 top-0 bottom-0 z-30" style={{ width: `${100 - bodyPos.left - bodyPos.width}%` }}>
                {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS)
                  .filter(([side]) => side === "right")
                  .map(([, top, muscle]) => {
                    const active = muscleDraft.includes(muscle);
                    return (
                      <button
                        key={muscle}
                        onClick={() =>
                          setMuscleDraft((prev) =>
                            prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                          )
                        }
                        className={`absolute left-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                          active ? "text-blue-400" : "text-white/70 hover:text-white"
                        }`}
                        style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                      >
                        <span className={`px-1.5 py-0.5 rounded ${active ? "bg-blue-500/20 border border-blue-500/40" : "bg-gray-800/80"}`}>
                          {properCase(muscle)}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Clear + Apply */}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setMuscleDraft([])}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => { setMuscleFilter(muscleDraft); setShowMusclePicker(false); }}
                className="flex-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Apply{muscleDraft.length > 0 ? ` (${muscleDraft.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
