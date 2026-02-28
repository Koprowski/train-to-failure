"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface WorkoutSet {
  id: string;
  exerciseId: string;
  weightLbs: number | null;
  reps: number | null;
  completed: boolean;
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  sets: WorkoutSet[];
}

interface MuscleGroupData {
  muscleGroup: string;
  setCount: number;
}

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export default function DashboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [muscleData, setMuscleData] = useState<MuscleGroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/stats/muscle-groups?days=30").then((r) => r.json()),
    ]).then(([w, m]) => {
      setWorkouts(Array.isArray(w) ? w : []);
      setMuscleData(m?.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTotalVolume = (sets: WorkoutSet[]) => {
    return sets.reduce((sum, s) => {
      if (s.weightLbs && s.reps && s.completed) return sum + s.weightLbs * s.reps;
      return sum;
    }, 0);
  };

  const recentWorkouts = workouts.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Track your training progress</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/workouts/quick"
            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors border border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Log Exercise
          </Link>
          <Link
            href="/workouts/new"
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start Workout
          </Link>
        </div>
      </div>

      {/* Recent Workouts */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Workouts</h2>
          <Link href="/workouts" className="text-emerald-500 text-sm hover:underline">
            View all
          </Link>
        </div>
        {recentWorkouts.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            No workouts yet. Start your first one!
          </p>
        ) : (
          <div className="space-y-3">
            {recentWorkouts.map((w) => {
              const uniqueExercises = new Set(w.sets.map((s) => s.exerciseId)).size;
              const volume = getTotalVolume(w.sets);
              return (
                <Link
                  key={w.id}
                  href={`/workouts/${w.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-gray-400 text-sm">
                      {formatDate(w.startedAt)} &middot; {uniqueExercises} exercise{uniqueExercises !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">{volume > 0 ? `${volume.toLocaleString()} lbs` : "--"}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Muscle Group Distribution */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sets by Muscle Group</h2>
          <span className="text-gray-500 text-sm">Last 30 days</span>
        </div>
        {muscleData.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            No data yet. Complete some workouts to see distribution.
          </p>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={muscleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="setCount"
                  nameKey="muscleGroup"
                >
                  {muscleData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#d1d5db" }}
                  formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} sets`, name ?? ""]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3 justify-center">
              {muscleData.slice(0, 8).map((d, i) => (
                <div key={d.muscleGroup} className="flex items-center gap-1.5 text-xs text-gray-300">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="capitalize">{d.muscleGroup} ({d.setCount})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
