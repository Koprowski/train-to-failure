"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
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
const VOLUME_COLOR = "#6366f1";

const MUSCLE_FILTERS = [
  { label: "All", filter: null },
  { label: "Chest", filter: ["chest"] },
  { label: "Back", filter: ["back", "lats", "traps"] },
  { label: "Shoulders", filter: ["shoulders"] },
  { label: "Arms", filter: ["biceps", "triceps", "forearms"] },
  { label: "Legs", filter: ["quads", "hamstrings", "glutes", "calves"] },
  { label: "Core", filter: ["abs", "core"] },
];

export default function ReportsPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [days, setDays] = useState(90);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [visibleSets, setVisibleSets] = useState<Set<number>>(new Set());
  const [showVolume, setShowVolume] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => {
        setExercises(Array.isArray(data) ? data : []);
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

      // Auto-detect set numbers and show all by default
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

  // Filter exercises by muscle group
  const mf = MUSCLE_FILTERS.find((f) => f.label === muscleFilter);
  const filteredExercises = mf?.filter
    ? exercises.filter((ex) =>
        mf.filter!.some((mg) => ex.muscleGroups.toLowerCase().includes(mg))
      )
    : exercises;

  // Further filter by search text
  const displayExercises = exerciseSearch.trim()
    ? filteredExercises.filter((ex) =>
        ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
      )
    : filteredExercises;

  // Build chart data: each row = { date, "Set 1": weight, "Set 2": weight, ..., volume }
  const maxSetNumber = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.setNumber)),
    0
  );

  const chartData = sessions.map((s) => {
    const row: Record<string, string | number> = { date: s.date };
    for (const set of s.sets) {
      row[`Set ${set.setNumber}`] = set.weightLbs;
    }
    row["Volume"] = s.totalVolume;
    return row;
  });

  // Summary stats
  const totalSessions = sessions.length;
  const maxWeight = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.weightLbs)),
    0
  );
  const avgVolume = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.totalVolume, 0) / totalSessions)
    : 0;

  // Trend: compare first half avg volume to second half
  const getTrend = () => {
    if (totalSessions < 4) return "neutral";
    const mid = Math.floor(totalSessions / 2);
    const firstHalf = sessions.slice(0, mid).reduce((s, x) => s + x.totalVolume, 0) / mid;
    const secondHalf = sessions.slice(mid).reduce((s, x) => s + x.totalVolume, 0) / (totalSessions - mid);
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

  const selectedExerciseName = exercises.find((e) => e.id === selectedExercise)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">Track your progress over time</p>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        {/* Muscle group filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MUSCLE_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => { setMuscleFilter(f.label); setSelectedExercise(""); setExerciseSearch(""); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                muscleFilter === f.label
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Exercise search + select */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search exercises..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          >
            <option value="">Select an exercise...</option>
            {displayExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
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
      </div>

      {/* Chart */}
      {selectedExercise && (
        <>
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
              {/* Set toggles */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">
                    {selectedExerciseName} - Weight Over Time
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3 mb-4">
                  {Array.from({ length: maxSetNumber }, (_, i) => i + 1).map((setNum) => (
                    <label key={setNum} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleSets.has(setNum)}
                        onChange={() => toggleSet(setNum)}
                        className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className="w-3 h-0.5 rounded"
                          style={{ backgroundColor: SET_COLORS[(setNum - 1) % SET_COLORS.length] }}
                        />
                        Set {setNum}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVolume}
                      onChange={() => setShowVolume(!showVolume)}
                      className="rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-0.5 rounded"
                        style={{ backgroundColor: VOLUME_COLOR }}
                      />
                      Total Volume
                    </span>
                  </label>
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
                      label={{ value: "lbs", angle: -90, position: "insideLeft", style: { fill: "#9ca3af" } }}
                    />
                    {showVolume && (
                      <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 12 }}
                        yAxisId="volume"
                        orientation="right"
                        label={{ value: "volume (lbs)", angle: 90, position: "insideRight", style: { fill: "#9ca3af" } }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#d1d5db" }}
                      labelFormatter={(d) => {
                        const date = new Date(String(d) + "T00:00:00");
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                      }}
                      formatter={(value: number | undefined, name: string | undefined) => {
                        const v = value ?? 0;
                        if (name === "Volume") return [`${v.toLocaleString()} lbs`, "Total Volume"];
                        return [`${v} lbs`, name ?? ""];
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
                    {showVolume && (
                      <Line
                        type="monotone"
                        dataKey="Volume"
                        stroke={VOLUME_COLOR}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 3 }}
                        yAxisId="volume"
                      />
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
                  <p className="text-gray-400 text-sm">Max Weight</p>
                  <p className="text-2xl font-bold mt-1">{maxWeight} lbs</p>
                </div>
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <p className="text-gray-400 text-sm">Avg Volume</p>
                  <p className="text-2xl font-bold mt-1">{avgVolume.toLocaleString()} lbs</p>
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
                        <th className="text-right py-2 pr-4">Max Weight</th>
                        <th className="text-right py-2">Volume</th>
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
                            {s.sets.map((set) => `${set.weightLbs}x${set.reps}`).join(", ")}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            {Math.max(...s.sets.map((set) => set.weightLbs))} lbs
                          </td>
                          <td className="py-2 text-right">{s.totalVolume.toLocaleString()} lbs</td>
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

      {!selectedExercise && !exercisesLoading && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-400">Select an exercise above to view your progress.</p>
        </div>
      )}
    </div>
  );
}
