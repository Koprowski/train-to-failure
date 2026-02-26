"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  equipment: string;
  type: string;
  instructions: string | null;
  videoUrl: string | null;
  links: string | null;
  isCustom: boolean;
}

interface HistoryEntry {
  date: string;
  workoutName: string;
  maxWeight: number;
  totalVolume: number;
  estimated1RM: number;
}

const BADGE_COLORS: Record<string, string> = {
  chest: "bg-red-500/20 text-red-400",
  back: "bg-blue-500/20 text-blue-400",
  shoulders: "bg-yellow-500/20 text-yellow-400",
  biceps: "bg-purple-500/20 text-purple-400",
  triceps: "bg-pink-500/20 text-pink-400",
  quads: "bg-green-500/20 text-green-400",
  hamstrings: "bg-teal-500/20 text-teal-400",
  glutes: "bg-orange-500/20 text-orange-400",
  calves: "bg-cyan-500/20 text-cyan-400",
  abs: "bg-indigo-500/20 text-indigo-400",
  core: "bg-indigo-500/20 text-indigo-400",
  lats: "bg-blue-500/20 text-blue-400",
  traps: "bg-amber-500/20 text-amber-400",
  forearms: "bg-lime-500/20 text-lime-400",
};

function getBadgeColor(group: string) {
  return BADGE_COLORS[group.toLowerCase().trim()] ?? "bg-gray-500/20 text-gray-400";
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    // not a valid url
  }
  return null;
}

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"maxWeight" | "estimated1RM" | "totalVolume">("maxWeight");

  useEffect(() => {
    Promise.all([
      fetch(`/api/exercises/${id}`).then((r) => r.json()),
      fetch(`/api/stats?exerciseId=${id}`).then((r) => r.json()),
    ]).then(([ex, stats]) => {
      setExercise(ex);
      setHistory(stats?.history ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Exercise not found</p>
        <Link href="/exercises" className="text-emerald-500 hover:underline mt-2 inline-block">
          Back to exercises
        </Link>
      </div>
    );
  }

  const muscleGroups = exercise.muscleGroups.split(",").map((g) => g.trim()).filter(Boolean);
  const equipmentList = exercise.equipment.split(",").map((e) => e.trim()).filter(Boolean);
  const embedUrl = exercise.videoUrl ? getYouTubeEmbedUrl(exercise.videoUrl) : null;
  let parsedLinks: { title: string; url: string }[] = [];
  if (exercise.links) {
    try {
      parsedLinks = JSON.parse(exercise.links);
    } catch {
      // ignore
    }
  }

  const chartLabel = chartMetric === "maxWeight" ? "Max Weight (lbs)" : chartMetric === "estimated1RM" ? "Est. 1RM (lbs)" : "Total Volume (lbs)";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/exercises" className="hover:text-white transition-colors">Exercises</Link>
        <span>/</span>
        <span className="text-white">{exercise.name}</span>
      </div>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{exercise.name}</h1>
          {exercise.isCustom && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Custom</span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-1 capitalize">{exercise.type.replace("_", " ")}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          {muscleGroups.map((mg) => (
            <span key={mg} className={`text-sm px-3 py-1 rounded-full ${getBadgeColor(mg)}`}>
              {mg}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {equipmentList.map((eq) => (
            <span key={eq} className="text-sm px-3 py-1 rounded-full bg-gray-700/50 text-gray-400">
              {eq}
            </span>
          ))}
        </div>

        {exercise.instructions && (
          <div className="mt-5">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Instructions</h3>
            <p className="text-gray-400 text-sm whitespace-pre-wrap">{exercise.instructions}</p>
          </div>
        )}
      </div>

      {/* Video */}
      {embedUrl && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Video</h2>
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`${exercise.name} video`}
            />
          </div>
        </div>
      )}

      {/* Training Links */}
      {parsedLinks.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-3">Training Links</h2>
          <div className="space-y-2">
            {parsedLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-sm"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {link.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* History Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Progress History</h2>
          <div className="flex gap-2">
            {(["maxWeight", "estimated1RM", "totalVolume"] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setChartMetric(metric)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  chartMetric === metric
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {metric === "maxWeight" ? "Weight" : metric === "estimated1RM" ? "Est. 1RM" : "Volume"}
              </button>
            ))}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm py-8 text-center">
            No history yet. Log some sets to see progress.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(d) => {
                  const date = new Date(d + "T00:00:00");
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#d1d5db" }}
                formatter={(value: number | undefined) => [value ?? 0, chartLabel]}
              />
              <Line
                type="monotone"
                dataKey={chartMetric}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent History Table */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Session History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Workout</th>
                  <th className="text-right py-2 pr-4">Max Weight</th>
                  <th className="text-right py-2 pr-4">Volume</th>
                  <th className="text-right py-2">Est. 1RM</th>
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().slice(0, 20).map((h) => (
                  <tr key={h.date} className="border-b border-gray-800/50">
                    <td className="py-2.5 pr-4 text-gray-300">{h.date}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{h.workoutName}</td>
                    <td className="py-2.5 pr-4 text-right">{h.maxWeight} lbs</td>
                    <td className="py-2.5 pr-4 text-right">{h.totalVolume.toLocaleString()} lbs</td>
                    <td className="py-2.5 text-right text-emerald-500">{h.estimated1RM} lbs</td>
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
