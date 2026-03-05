"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

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

const RADIAN = Math.PI / 180;

const ANIM_DURATION = 800;

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderInnerLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
}

function renderOuterLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, name, fill, viewBox } = props;
  const chartW = viewBox?.width ?? 400;
  const chartH = viewBox?.height ?? 360;
  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);
  // Elbow point
  const ex = cx + (outerRadius + 10) * cos;
  const ey = cy + (outerRadius + 10) * sin;
  // End point -- push further out horizontally
  let tx = cx + (outerRadius + 26) * cos;
  let ty = cy + (outerRadius + 26) * sin;
  // Clamp to stay within chart bounds with padding
  const pad = 6;
  tx = Math.max(pad, Math.min(chartW - pad, tx));
  ty = Math.max(pad + 8, Math.min(chartH - pad, ty));
  const textAnchor = cos >= 0 ? "start" : "end";
  return (
    <g>
      <path d={`M${cx + outerRadius * cos},${cy + outerRadius * sin}L${ex},${ey}L${tx},${ty}`} stroke={fill} fill="none" strokeWidth={1} />
      <text x={tx + (cos >= 0 ? 4 : -4)} y={ty} textAnchor={textAnchor} fill="#d1d5db" fontSize={11} dominantBaseline="central" className="capitalize">
        {name}
      </text>
    </g>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [muscleData, setMuscleData] = useState<MuscleGroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartAnimDone, setChartAnimDone] = useState(false);

  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateVal, setEditDateVal] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const openDateEditor = (e: React.MouseEvent, w: Workout) => {
    e.stopPropagation();
    const d = new Date(w.startedAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditDateVal(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setEditingDateId(w.id);
  };

  const handleDateSave = async () => {
    if (!editingDateId || !editDateVal) return;
    try {
      const res = await fetch(`/api/workouts/${editingDateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt: new Date(editDateVal).toISOString() }),
      });
      if (res.ok) {
        setWorkouts((prev) => prev.map((w) => w.id === editingDateId ? { ...w, startedAt: new Date(editDateVal).toISOString() } : w));
      }
    } finally {
      setEditingDateId(null);
    }
  };

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

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/stats/muscle-groups?days=30").then((r) => r.json()),
      fetch("/api/exercises/favorites").then((r) => r.ok ? r.json() : []).catch(() => []),
    ]).then(([w, m, favIds]) => {
      setWorkouts(Array.isArray(w) ? w : []);
      setMuscleData(m?.data ?? []);
      if (Array.isArray(favIds)) setFavoriteIds(new Set(favIds));
      setLoading(false);
      // Delay inner labels until pie animation completes
      setTimeout(() => setChartAnimDone(true), ANIM_DURATION + 100);
    }).catch(() => setLoading(false));
  }, []);

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
            className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Log
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
              const isActive = !w.finishedAt;
              const hasIncompleteSets = !isActive && w.sets.some((s) => !s.completed);
              const uniqueExercises = (() => {
                const map = new Map<string, { id: string; name: string; sets: { weightLbs: number | null; reps: number | null }[] }>();
                for (const s of w.sets) {
                  if (!map.has(s.exerciseId)) {
                    map.set(s.exerciseId, { id: s.exerciseId, name: s.exercise.name, sets: [] });
                  }
                  map.get(s.exerciseId)!.sets.push({ weightLbs: s.weightLbs, reps: s.reps });
                }
                return Array.from(map.values());
              })();
              const totalVolume = w.sets.reduce((sum, s) => {
                if (s.weightLbs && s.reps) return sum + s.weightLbs * s.reps;
                return sum;
              }, 0);
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
                        {hasIncompleteSets && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full shrink-0">
                            Needs Review
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        <button
                          onClick={(e) => { e.preventDefault(); openDateEditor(e, w); }}
                          className="hover:text-emerald-400 transition-colors"
                        >
                          {formatDate(w.startedAt)} at {formatTime(w.startedAt)}
                        </button>
                      </p>
                    </div>
                    <div className="flex items-start gap-2 shrink-0 ml-4">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/workouts/new?duplicateFrom=${w.id}`); }}
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
          <div className="flex flex-col items-center overflow-visible">
            <ResponsiveContainer width="100%" height={360}>
              <PieChart margin={{ top: 30, right: 60, bottom: 30, left: 60 }}>
                <Pie
                  data={muscleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="setCount"
                  nameKey="muscleGroup"
                  label={chartAnimDone ? renderOuterLabel : false}
                  labelLine={false}
                  animationDuration={ANIM_DURATION}
                >
                  {muscleData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {chartAnimDone && (
                  <Pie
                    data={muscleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="setCount"
                    nameKey="muscleGroup"
                    label={renderInnerLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {muscleData.map((_, index) => (
                      <Cell key={index} fill="transparent" stroke="none" />
                    ))}
                  </Pie>
                )}
                {/* Total sets in center */}
                {chartAnimDone && (
                  <>
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-2xl font-bold">
                      {muscleData.reduce((sum, d) => sum + d.setCount, 0)}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-400 text-xs">
                      sets
                    </text>
                  </>
                )}
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#d1d5db" }}
                  formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0} sets`, name ?? ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Date Edit Modal */}
      {editingDateId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingDateId(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Workout Date</h2>
            <input
              type="datetime-local"
              value={editDateVal}
              onChange={(e) => setEditDateVal(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              onFocus={(e) => { try { e.target.showPicker?.(); } catch {} }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingDateId(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDateSave}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
