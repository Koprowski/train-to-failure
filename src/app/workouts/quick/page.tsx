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
    rpe: number | null;
  }[];
}

const MUSCLE_TABS = [
  { label: "Recent", filter: null },
  { label: "All", filter: null },
  { label: "Arms", filter: ["biceps", "triceps", "forearms"] },
  { label: "Back", filter: ["back", "lats", "traps"] },
  { label: "Chest", filter: ["chest"] },
  { label: "Core", filter: ["abs", "obliques"] },
  { label: "Legs", filter: ["quads", "hamstrings", "glutes", "calves"] },
  { label: "Shoulders", filter: ["shoulders"] },
];

export default function QuickLogPage() {
  const router = useRouter();
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Recent");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/exercises/recent?days=14").then((r) => r.json()),
      fetch("/api/exercises").then((r) => r.json()),
    ]).then(([recent, all]) => {
      setRecentExercises(Array.isArray(recent) ? recent : []);
      setAllExercises(Array.isArray(all) ? all : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const startQuickLog = async (exercise: Exercise) => {
    if (starting) return;
    setStarting(exercise.id);

    try {
      // Create a quick-log workout
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: exercise.name,
          isQuickLog: true,
        }),
      });
      const workout = await res.json();

      if (workout.id) {
        router.push(`/workouts/new?resume=${workout.id}&quickExercise=${exercise.id}`);
      }
    } catch (err) {
      console.error("Failed to start quick log:", err);
      setStarting(null);
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

  const searchResults = search.trim()
    ? allExercises.filter(
        (ex) => ex.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
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

      {/* Search */}
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

      {/* Search results */}
      {search.trim() && (
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-gray-400 px-1">Search Results</h2>
          {searchResults.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No exercises found</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
              {searchResults.slice(0, 10).map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => startQuickLog(ex)}
                  disabled={starting !== null}
                  className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700 shrink-0 flex items-center justify-center text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{ex.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{ex.muscleGroups}</p>
                  </div>
                  {starting === ex.id && (
                    <div className="ml-auto animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Muscle group tabs + exercise list */}
      {!search.trim() && (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {MUSCLE_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.label
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Recent tab */}
          {activeTab === "Recent" && (
            <div className="space-y-2">
              {recentExercises.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                  <p className="text-gray-500 text-sm">No recent exercises. Try another tab or search above.</p>
                </div>
              ) : (
                recentExercises.map((recent) => (
                  <button
                    key={recent.exercise.id}
                    onClick={() => startQuickLog(recent.exercise)}
                    disabled={starting !== null}
                    className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:bg-gray-800/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      {recent.exercise.imageUrl ? (
                        <img src={recent.exercise.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-700 shrink-0 flex items-center justify-center text-gray-500">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{recent.exercise.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{recent.exercise.muscleGroups}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-emerald-500 font-medium">{recent.summary}</p>
                        <p className="text-xs text-gray-500">{formatDate(recent.lastPerformed)}</p>
                      </div>
                      {starting === recent.exercise.id && (
                        <div className="ml-2 animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* All / Muscle group tabs */}
          {activeTab !== "Recent" && (() => {
            const tab = MUSCLE_TABS.find((t) => t.label === activeTab);
            const filtered = tab?.filter
              ? allExercises.filter((ex) =>
                  tab.filter!.some((mg) => ex.muscleGroups.toLowerCase().includes(mg))
                )
              : allExercises;
            return filtered.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm">No exercises found in this category.</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800">
                {filtered.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => startQuickLog(ex)}
                    disabled={starting !== null}
                    className="w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors flex items-center gap-3 disabled:opacity-50"
                  >
                    {ex.imageUrl ? (
                      <img src={ex.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-700 shrink-0 flex items-center justify-center text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">{ex.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{ex.muscleGroups}</p>
                    </div>
                    {starting === ex.id && (
                      <div className="ml-auto animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
