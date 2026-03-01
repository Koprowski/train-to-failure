"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  imageUrl: string | null;
}

interface RecentExercise {
  exercise: Exercise;
  lastPerformed: string;
  summary: string;
}

interface SessionSet {
  setNumber: number;
  weightLbs: number;
  reps: number;
  rpe: number | null;
}

interface Session {
  date: string;
  sets: SessionSet[];
  totalVolume: number;
}

const SET_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ReportsPage() {
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [days, setDays] = useState(90);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [visibleSets, setVisibleSets] = useState<Set<number>>(new Set());
  const [chartMode, setChartMode] = useState<"volume" | "e1rm">("volume");
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/exercises/recent?days=90")
      .then((r) => r.json())
      .then((data) => {
        const recent: RecentExercise[] = Array.isArray(data) ? data : [];
        setRecentExercises(recent);
        if (recent.length > 0) {
          setSelectedExercise(recent[0].exercise.id);
        }
        setExercisesLoading(false);
      })
      .catch(() => setExercisesLoading(false));
  }, []);

  const fetchProgress = useCallback(async (exerciseId: string, dayRange: number) => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stats/progress?exerciseId=${exerciseId}&days=${dayRange}`);
      const data = await res.json();
      const s: Session[] = data.sessions ?? [];
      setSessions(s);

      const setNums = new Set<number>();
      for (const session of s) {
        for (const set of session.sets) {
          setNums.add(set.setNumber);
        }
      }
      setVisibleSets(setNums);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      fetchProgress(selectedExercise, days);
    }
  }, [selectedExercise, days, fetchProgress]);

  // Detect if exercise has weight data
  const hasWeightData = sessions.some((s) => s.sets.some((set) => set.weightLbs > 0));

  // Chart data
  const maxSetNumber = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.setNumber)),
    0
  );

  // Store set breakdowns for tooltip access
  const setDetails = new Map<string, Map<string, { weight: number; reps: number }>>();

  const chartData = sessions.map((s) => {
    const row: Record<string, string | number> = { date: s.date };
    const dateDetails = new Map<string, { weight: number; reps: number }>();
    for (const set of s.sets) {
      const key = `Set ${set.setNumber}`;
      if (!hasWeightData) {
        row[key] = set.reps;
      } else if (chartMode === "volume") {
        row[key] = set.weightLbs * set.reps;
      } else {
        // E1RM: weight * (1 + reps/30)
        row[key] = set.reps === 1 ? set.weightLbs : Math.round(set.weightLbs * (1 + set.reps / 30) * 10) / 10;
      }
      dateDetails.set(key, { weight: set.weightLbs, reps: set.reps });
    }
    row["Total Reps"] = s.sets.reduce((sum, set) => sum + set.reps, 0);
    setDetails.set(s.date, dateDetails);
    return row;
  });

  // Summary stats
  const totalSessions = sessions.length;
  const maxWeight = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.weightLbs)),
    0
  );
  const totalReps = sessions.reduce(
    (sum, s) => sum + s.sets.reduce((ss, set) => ss + set.reps, 0),
    0
  );
  const avgRepsPerSession = totalSessions > 0 ? Math.round(totalReps / totalSessions) : 0;
  const avgVolume = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.totalVolume, 0) / totalSessions)
    : 0;

  const getTrend = () => {
    if (totalSessions < 4) return "neutral";
    const mid = Math.floor(totalSessions / 2);
    const metricFn = hasWeightData
      ? (s: Session) => s.totalVolume
      : (s: Session) => s.sets.reduce((sum, set) => sum + set.reps, 0);
    const firstHalf = sessions.slice(0, mid).reduce((s, x) => s + metricFn(x), 0) / mid;
    const secondHalf = sessions.slice(mid).reduce((s, x) => s + metricFn(x), 0) / (totalSessions - mid);
    const change = (secondHalf - firstHalf) / firstHalf;
    if (change > 0.05) return "up";
    if (change < -0.05) return "down";
    return "neutral";
  };
  const trend = getTrend();

  const toggleSet = (setNum: number) => {
    setVisibleSets((prev) => {
      const next = new Set(prev);
      if (next.has(setNum)) next.delete(setNum);
      else next.add(setNum);
      return next;
    });
  };

  const selectedExerciseName = recentExercises.find((r) => r.exercise.id === selectedExercise)?.exercise.name;

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 200;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (exercisesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Track your progress over time</p>
      </div>

      {/* Exercise carousel */}
      {recentExercises.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-400">Complete some workouts to see your progress reports.</p>
        </div>
      ) : (
        <>
          {/* Carousel */}
          <div className="relative">
            {recentExercises.length > 3 && (
              <>
                <button
                  onClick={() => scrollCarousel("left")}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900/90 border border-gray-700 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900/90 border border-gray-700 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1"
            >
              {recentExercises.map((recent) => (
                <button
                  key={recent.exercise.id}
                  onClick={() => setSelectedExercise(recent.exercise.id)}
                  className={`flex-shrink-0 w-40 rounded-xl p-3 text-left transition-all ${
                    selectedExercise === recent.exercise.id
                      ? "bg-emerald-500/20 border-2 border-emerald-500 ring-1 ring-emerald-500/50"
                      : "bg-gray-900 border border-gray-800 hover:border-gray-600"
                  }`}
                >
                  {recent.exercise.imageUrl ? (
                    <img
                      src={recent.exercise.imageUrl}
                      alt=""
                      className="w-full h-20 rounded-lg object-cover mb-2"
                    />
                  ) : (
                    <div className="w-full h-20 rounded-lg bg-gray-800 mb-2 flex items-center justify-center text-gray-600">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <p className="font-medium text-sm truncate">{recent.exercise.name}</p>
                  <p className="text-xs text-gray-400 capitalize truncate">{recent.exercise.muscleGroups}</p>
                  <p className="text-xs text-emerald-500 mt-1">{recent.summary}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="flex gap-2">
            {[30, 60, 90, 0].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  days === d
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {d === 0 ? "All" : `${d}d`}
              </button>
            ))}
          </div>

          {/* Chart */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
              <p className="text-gray-500">No data for this exercise in the selected time range.</p>
            </div>
          ) : (
            <>
              {/* Set toggles + chart */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">
                    {selectedExerciseName} - {!hasWeightData ? "Reps Per Set Over Time" : chartMode === "volume" ? "Volume Per Set Over Time" : "Est. 1RM Per Set Over Time"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {Array.from({ length: maxSetNumber }, (_, i) => i + 1).map((setNum) => (
                    <label key={setNum} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleSets.has(setNum)}
                        onChange={() => toggleSet(setNum)}
                        className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-0.5 rounded"
                          style={{ backgroundColor: SET_COLORS[(setNum - 1) % SET_COLORS.length] }}
                        />
                        Set {setNum}
                      </span>
                    </label>
                  ))}
                  {hasWeightData && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className={`text-xs font-medium ${chartMode === "volume" ? "text-white" : "text-gray-500"}`}>Volume</span>
                      <button
                        onClick={() => setChartMode(chartMode === "volume" ? "e1rm" : "volume")}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-gray-700 shrink-0"
                        role="switch"
                        aria-checked={chartMode === "e1rm"}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-500 transition-transform duration-200"
                          style={{ transform: chartMode === "e1rm" ? "translateX(18px)" : "translateX(3px)" }}
                        />
                      </button>
                      <span className={`text-xs font-medium ${chartMode === "e1rm" ? "text-white" : "text-gray-500"}`}>E1RM</span>
                    </div>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(d: string) => {
                        const date = new Date(d + "T00:00:00");
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      yAxisId="weight"
                      label={{ value: !hasWeightData ? "reps" : chartMode === "volume" ? "lbs (vol)" : "lbs (E1RM)", angle: -90, position: "insideLeft", style: { fill: "#9ca3af" } }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#d1d5db" }}
                      labelFormatter={(d) => {
                        const date = new Date(String(d) + "T00:00:00");
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                      formatter={(value: number | undefined, name: string | undefined, props: { payload?: Record<string, string | number> }) => {
                        const v = value ?? 0;
                        if (name === "Total Reps") return [`${v}`, "Total Reps"];
                        const date = props.payload?.date as string | undefined;
                        if (date && name) {
                          const details = setDetails.get(date)?.get(name);
                          if (details) {
                            if (!hasWeightData) return [`${details.reps} reps`, name];
                            if (chartMode === "volume") {
                              return [`${v.toLocaleString()} lbs (${details.reps} x ${details.weight} lbs)`, name];
                            }
                            return [`${v} lbs E1RM (${details.reps} x ${details.weight} lbs)`, name];
                          }
                        }
                        return [hasWeightData ? `${v.toLocaleString()} lbs` : `${v} reps`, name ?? ""];
                      }}
                    />
                    <Legend />
                    {Array.from({ length: maxSetNumber }, (_, i) => i + 1).map((setNum) =>
                      visibleSets.has(setNum) ? (
                        <Line
                          key={setNum}
                          type="monotone"
                          dataKey={`Set ${setNum}`}
                          stroke={SET_COLORS[(setNum - 1) % SET_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                          yAxisId="weight"
                        />
                      ) : null
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">Sessions</p>
                  <p className="text-2xl font-bold mt-1">{totalSessions}</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">{hasWeightData ? "Max Weight" : "Total Reps"}</p>
                  <p className="text-2xl font-bold mt-1">{hasWeightData ? `${maxWeight} lbs` : totalReps}</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">{hasWeightData ? "Avg Volume" : "Avg Reps/Session"}</p>
                  <p className="text-2xl font-bold mt-1">{hasWeightData ? `${avgVolume.toLocaleString()} lbs` : avgRepsPerSession}</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">Trend</p>
                  <p className={`text-2xl font-bold mt-1 ${
                    trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-gray-400"
                  }`}>
                    {trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Steady"}
                  </p>
                </div>
              </div>

              {/* Session detail table */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <h2 className="text-lg font-semibold mb-4">Session History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left py-2 pr-4">Date</th>
                        <th className="text-left py-2 pr-4">Sets</th>
                        {hasWeightData && <th className="text-right py-2 pr-4">Max Weight</th>}
                        <th className="text-right py-2">{hasWeightData ? "Volume" : "Total Reps"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice().reverse().map((s) => (
                        <tr key={s.date} className="border-b border-gray-800/50">
                          <td className="py-2 pr-4">
                            {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 pr-4 text-gray-400">
                            {hasWeightData
                              ? s.sets.map((set) => `${set.weightLbs}x${set.reps}`).join(", ")
                              : s.sets.map((set) => `${set.reps} reps`).join(", ")}
                          </td>
                          {hasWeightData && (
                            <td className="py-2 pr-4 text-right">
                              {Math.max(...s.sets.map((set) => set.weightLbs))} lbs
                            </td>
                          )}
                          <td className="py-2 text-right">
                            {hasWeightData
                              ? `${s.totalVolume.toLocaleString()} lbs`
                              : s.sets.reduce((sum, set) => sum + set.reps, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
