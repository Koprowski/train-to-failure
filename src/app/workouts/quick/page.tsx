"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  imageUrl: string | null;
  type: string;
  equipment: string;
}

interface RecentExercise {
  exercise: Exercise;
  lastPerformed: string;
  setCount: number;
  summary: string;
  lastSets: {
    setNumber: number;
    setType: string;
    weightLbs: number | null;
    reps: number | null;
    timeSecs: number | null;
    rir: number | null;
  }[];
}

const PINNED_TABS = ["Recent", "Favorites", "All"];

const POPULAR_EXERCISE_NAMES = new Set([
  "Bench Press - Barbell",
  "Barbell Olympic Squat",
  "Barbell Deadlift",
  "Dumbbell Biceps Curl",
  "Pull Up",
  "Dumbbell Lateral Raise",
  "Dumbbell Bent Over Row",
  "Cable Lat Pulldown",
  "Leg Press",
  "Barbell Hip Thrust",
]);

function formatQuickWorkoutName(name: string) {
  const trimmed = name.trim();
  return /workout$/i.test(trimmed) ? trimmed : `${trimmed} Workout`;
}

const REPEAT_ICON = "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15";

export default function QuickLogPage() {
  const router = useRouter();
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises/recent?days=14").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/exercises").then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch("/api/exercises/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([recent, all, favIds]) => {
      const recentArr = Array.isArray(recent) ? recent : [];
      setRecentExercises(recentArr);
      setAllExercises(Array.isArray(all) ? all : []);
      if (Array.isArray(favIds)) setFavoriteIds(new Set(favIds));
      setActiveTab(recentArr.length > 0 ? "Recent" : "All");
      setLoading(false);
    });
  }, []);

  const openExercise = (exerciseId: string) => {
    router.push(`/exercises/${exerciseId}`);
  };

  const startQuickLog = async (exercise: Exercise) => {
    if (starting) return;
    setStarting(exercise.id);

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formatQuickWorkoutName(exercise.name),
          isQuickLog: true,
        }),
      });
      const workout = await res.json();

      if (workout.id) {
        router.push(`/workouts/new?resume=${workout.id}&quickExercise=${exercise.id}`);
      } else {
        setStarting(null);
      }
    } catch (err) {
      console.error("Failed to start quick log:", err);
      setStarting(null);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const muscleGroupTabs = (() => {
    const groups = new Set<string>();
    for (const ex of allExercises) {
      for (const mg of ex.muscleGroups.split(",").map((g) => g.trim().toLowerCase()).filter(Boolean)) {
        groups.add(mg);
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  })();

  const allTabs = [...PINNED_TABS, ...muscleGroupTabs.map((mg) => mg.charAt(0).toUpperCase() + mg.slice(1))];

  const searchResults = search.trim()
    ? allExercises.filter((ex) => ex.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const renderExerciseRow = (exercise: Exercise, options?: { summary?: string; subtext?: string }) => (
    <div key={exercise.id} className="flex items-center bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800/50 transition-colors">
      <button
        onClick={() => startQuickLog(exercise)}
        disabled={starting !== null}
        className="flex-1 text-left p-4 flex items-center gap-3 disabled:opacity-50"
      >
        {exercise.imageUrl ? (
          <img src={exercise.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-700 shrink-0 flex items-center justify-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{exercise.name}</p>
          <p className="text-xs text-gray-400 capitalize">{exercise.muscleGroups}</p>
        </div>
        {starting === exercise.id ? (
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-emerald-500 shrink-0" />
        ) : options?.summary ? (
          <div className="text-right shrink-0">
            <p className="text-sm text-emerald-500 font-medium">{options.summary}</p>
            {options.subtext ? <p className="text-xs text-gray-500">{options.subtext}</p> : null}
          </div>
        ) : null}
      </button>
      <div className="flex items-center shrink-0 pr-2">
        <button
          onClick={() => openExercise(exercise.id)}
          className="p-3 text-gray-500 hover:text-emerald-400 transition-colors"
          title="View exercise details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button onClick={(e) => toggleFavorite(e, exercise.id)} className="p-3 shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={favoriteIds.has(exercise.id) ? "#ef4444" : "none"} stroke={favoriteIds.has(exercise.id) ? "#ef4444" : "#6b7280"} strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold">Log Exercise</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pick an exercise to start logging sets</p>
        </div>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search all exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {search.trim() && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-gray-400 px-1">Search Results</h2>
          {searchResults.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No exercises found</p>
          ) : (
            <div className="space-y-2">
              {searchResults.slice(0, 10).map((ex) => renderExerciseRow(ex))}
            </div>
          )}
        </div>
      )}

      {!search.trim() && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Recent" && (
            <div className="space-y-2">
              {recentExercises.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-500 text-sm">No recent exercises. Try another tab or search above.</p>
                </div>
              ) : (
                recentExercises.map((recent) => renderExerciseRow(recent.exercise, {
                  summary: recent.summary,
                  subtext: formatDate(recent.lastPerformed),
                }))
              )}
            </div>
          )}

          {activeTab === "Favorites" && (() => {
            const favorites = allExercises.filter((ex) => favoriteIds.has(ex.id));
            return favorites.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">No favorites yet. Tap the heart icon on exercises in the library to add them.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favorites.map((ex) => renderExerciseRow(ex))}
              </div>
            );
          })()}

          {activeTab !== "Recent" && activeTab !== "Favorites" && (() => {
            const filterGroup = activeTab === "All" ? null : activeTab?.toLowerCase();
            const filtered = filterGroup
              ? allExercises.filter((ex) =>
                  ex.muscleGroups.toLowerCase().split(",").map((g) => g.trim()).includes(filterGroup)
                )
              : allExercises;
            const showPopular = activeTab === "All" && recentExercises.length === 0;
            const popular = showPopular ? filtered.filter((ex) => POPULAR_EXERCISE_NAMES.has(ex.name)) : [];
            const remaining = showPopular ? filtered.filter((ex) => !POPULAR_EXERCISE_NAMES.has(ex.name)) : filtered;
            return filtered.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">No exercises found in this category.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {popular.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-400 px-1 pt-1">Popular exercises to get started</p>
                    {popular.map((ex) => renderExerciseRow(ex))}
                    <p className="text-xs font-medium text-gray-400 px-1 pt-3">All exercises</p>
                  </>
                )}
                {remaining.map((ex) => renderExerciseRow(ex))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
