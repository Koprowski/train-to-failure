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

  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchMoved, setTouchMoved] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSwipeId(id);
    setSwipeX(0);
    setTouchMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !swipeId) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setTouchMoved(true);
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setSwipeX(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeId) return;
    const threshold = 80;
    if (swipeX < -threshold) {
      handleDeleteWorkout(swipeId);
    } else if (swipeX > threshold) {
      const w = workouts.find((w) => w.id === swipeId);
      if (w) { setEditingWorkout(w); setEditName(w.name); }
    } else if (!touchMoved) {
      router.push(`/workouts/${swipeId}`);
    }
    setSwipeId(null);
    setSwipeX(0);
    setTouchStart(null);
    setTouchMoved(false);
  };

  const handleDeleteWorkout = async (id: string) => {
    if (!confirm("Delete this workout?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingWorkout) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/workouts/${editingWorkout.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        setWorkouts((prev) => prev.map((w) => w.id === editingWorkout.id ? { ...w, name: editName } : w));
        setEditingWorkout(null);
      }
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/stats/muscle-groups?days=30").then((r) => r.json()),
    ]).then(([w, m]) => {
      setWorkouts(Array.isArray(w) ? w : []);
      setMuscleData(m?.data ?? []);
      setLoading(false);
      // Delay inner labels until pie animation completes
      setTimeout(() => setChartAnimDone(true), ANIM_DURATION + 100);
    }).catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
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
              const totalReps = w.sets.reduce((sum, s) => sum + (s.reps || 0), 0);
              const lastSets = w.sets.filter((s) => s.completed).slice(-3);
              const isActive = swipeId === w.id;
              const offset = isActive ? swipeX : 0;
              return (
                <div key={w.id} className="relative overflow-hidden rounded-lg">
                  {offset > 0 && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center pl-4">
                      <span className="text-blue-400 text-sm font-medium">Edit</span>
                    </div>
                  )}
                  {offset < 0 && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-end pr-4">
                      <span className="text-red-400 text-sm font-medium">Delete</span>
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-transform cursor-pointer relative z-10 ${
                      deleting === w.id ? "opacity-50" : ""
                    }`}
                    style={{ transform: `translateX(${offset}px)` }}
                    onTouchStart={(e) => handleTouchStart(w.id, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => { if (!swipeId) router.push(`/workouts/${w.id}`); }}
                  >
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-gray-400 text-sm">
                        {formatDate(w.startedAt)} &middot; {totalReps} rep{totalReps !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {lastSets.length > 0 && (
                      <div className="flex gap-2 shrink-0">
                        {lastSets.map((s, i) => (
                          <div key={i} className="text-center text-xs min-w-[32px]">
                            <p className="text-gray-300 font-medium">{s.weightLbs ?? "BW"}</p>
                            <p className="text-gray-300">{s.reps ?? 0}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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

      {/* Edit Workout Modal */}
      {editingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditingWorkout(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Workout</h2>
              <button onClick={() => setEditingWorkout(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Workout Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingWorkout(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
