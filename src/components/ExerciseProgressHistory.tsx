"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ExerciseHistoryEntry {
  date: string;
  workoutName: string;
  maxWeight: number;
  averageWeight: number;
  totalVolume: number;
  estimated1RM: number;
  totalReps: number;
  sets: { setNumber: number; weightLbs: number | null; reps: number | null }[];
}

type ChartMetric = "weightAndReps" | "estimated1RM" | "totalVolume" | "totalReps";
type InitialMetric = ChartMetric | "maxWeight";

export default function ExerciseProgressHistory({
  history,
  defaultMetric,
  compact = false,
  showSessionHistory = true,
}: {
  history: ExerciseHistoryEntry[];
  defaultMetric?: InitialMetric;
  compact?: boolean;
  showSessionHistory?: boolean;
}) {
  const hasWeightData = history.some((entry) => entry.maxWeight > 0);
  const initialMetric: ChartMetric =
    defaultMetric === "maxWeight"
      ? "weightAndReps"
      : defaultMetric ?? (hasWeightData ? "estimated1RM" : "totalReps");
  const [chartMetric, setChartMetric] = useState<ChartMetric>(initialMetric);
  const chartLabel =
    chartMetric === "weightAndReps"
      ? "Weight + Reps"
      : chartMetric === "estimated1RM"
        ? "Est. 1RM (lbs)"
        : chartMetric === "totalVolume"
          ? "Total Volume (lbs)"
          : "Total Reps";

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Progress History</h2>
          <div className="flex gap-2 flex-wrap">
            {(["estimated1RM", hasWeightData ? "weightAndReps" : "totalReps", "totalVolume"] as const).map((metric) => {
              const isWeightMetric = metric !== "totalReps";
              const disabled = isWeightMetric && !hasWeightData;
              return (
                <button
                  key={metric}
                  onClick={() => !disabled && setChartMetric(metric)}
                  disabled={disabled}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    chartMetric === metric
                      ? "bg-emerald-500 text-gray-900 font-bold"
                      : disabled
                        ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {metric === "weightAndReps" ? "Weight + Reps" : metric === "estimated1RM" ? "Est. 1RM" : metric === "totalVolume" ? "Volume" : "Reps"}
                </button>
              );
            })}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            No history yet. Log some sets to see progress.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={compact ? 240 : 300}>
            <LineChart data={history} margin={{ top: 5, right: chartMetric === "weightAndReps" ? 55 : 20, left: 25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fontWeight: "bold", fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(`${value}T00:00:00`);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                yAxisId="left"
                stroke={chartMetric === "weightAndReps" ? "#10b981" : "#6b7280"}
                tick={{ fontWeight: "bold", fontSize: 12 }}
                domain={[
                  (min: number) => Math.max(0, Math.floor(min * 0.9)),
                  (max: number) => Math.ceil(max * 1.05),
                ]}
                label={chartMetric === "weightAndReps" ? {
                  value: "Avg Weight",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "#10b981", fontWeight: "bold", fontSize: 11 },
                } : undefined}
              />
              {chartMetric === "weightAndReps" && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#3b82f6"
                  tick={{ fontWeight: "bold", fontSize: 12 }}
                  domain={[
                    (min: number) => Math.max(0, Math.floor(min * 0.9)),
                    (max: number) => Math.ceil(max * 1.05),
                  ]}
                  label={{
                    value: "Reps",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle", fill: "#3b82f6", fontWeight: "bold", fontSize: 11 },
                  }}
                />
              )}
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                formatter={(value: number | undefined, name?: string) => {
                  if (chartMetric === "weightAndReps") {
                    return [value ?? 0, name ?? ""];
                  }
                  const formatted = chartMetric === "totalVolume"
                    ? (value ?? 0).toLocaleString()
                    : value ?? 0;
                  return [formatted, chartLabel];
                }}
              />
              {chartMetric === "weightAndReps" ? (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="averageWeight"
                    name="Avg Weight (lbs)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalReps"
                    name="Reps"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </>
              ) : (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {showSessionHistory && history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Session History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Workout</th>
                  <th className="text-right py-2 pr-4">Sets</th>
                  <th className="text-right py-2 pr-4">Reps</th>
                  {hasWeightData && <th className="text-right py-2 pr-4">Max Weight</th>}
                  {hasWeightData && <th className="text-right py-2 pr-4">Volume</th>}
                  {hasWeightData && <th className="text-right py-2">Est. 1RM</th>}
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().slice(0, 20).map((entry, index) => (
                  <tr key={`${entry.date}-${entry.workoutName}-${index}`} className="border-b border-gray-800/50">
                    <td className="py-2.5 pr-4 text-gray-300">{entry.date}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{entry.workoutName}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex justify-end gap-2">
                        {entry.sets.map((set) => (
                          <div key={set.setNumber} className="min-w-[32px] text-center text-xs">
                            <p className="font-medium text-gray-300">{set.weightLbs ?? "BW"}</p>
                            <p className="text-gray-400">{set.reps ?? 0}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">{entry.totalReps}</td>
                    {hasWeightData && <td className="py-2.5 pr-4 text-right">{entry.maxWeight} lbs</td>}
                    {hasWeightData && <td className="py-2.5 pr-4 text-right">{entry.totalVolume.toLocaleString()} lbs</td>}
                    {hasWeightData && <td className="py-2.5 text-right text-emerald-500">{entry.estimated1RM} lbs</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
