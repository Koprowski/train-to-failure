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
  imageUrl: string | null;
  videoUrl: string | null;
  links: string | null;
  isCustom: boolean;
  userId: string | null;
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

function parseYouTubeUrl(url: string): { videoId: string; startSeconds: number } | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    let startSeconds = 0;

    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      const t = u.searchParams.get("t");
      if (t) {
        // Handle "104s" or "104" or "1m44s" formats
        const match = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
        if (match) {
          startSeconds = (parseInt(match[1] || "0") * 3600) + (parseInt(match[2] || "0") * 60) + parseInt(match[3] || "0");
        }
      }
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
      const t = u.searchParams.get("t");
      if (t) {
        startSeconds = parseInt(t) || 0;
      }
    }

    if (videoId) return { videoId, startSeconds };
  } catch {
    // not a valid url
  }
  return null;
}

function YouTubeLite({ videoId, startSeconds, title }: { videoId: string; startSeconds: number; title: string }) {
  const [playing, setPlaying] = useState(false);

  const embedParams = [`autoplay=1`, startSeconds > 0 ? `start=${startSeconds}` : ""].filter(Boolean).join("&");

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${embedParams}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="w-full h-full relative group cursor-pointer bg-black"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-500 transition-colors shadow-lg">
          <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"maxWeight" | "estimated1RM" | "totalVolume">("maxWeight");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    muscleGroups: "",
    equipment: "",
    type: "",
    instructions: "",
    videoUrl: "",
  });

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

  function openEdit() {
    if (!exercise) return;
    setEditForm({
      name: exercise.name,
      muscleGroups: exercise.muscleGroups,
      equipment: exercise.equipment,
      type: exercise.type,
      instructions: exercise.instructions ?? "",
      videoUrl: exercise.videoUrl ?? "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    if (!exercise) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exercises/${exercise.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          muscleGroups: editForm.muscleGroups,
          equipment: editForm.equipment,
          type: editForm.type,
          instructions: editForm.instructions || null,
          videoUrl: editForm.videoUrl || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setExercise(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

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
  const ytData = exercise.videoUrl ? parseYouTubeUrl(exercise.videoUrl) : null;
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
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {exercise.imageUrl && (
          <div className="h-56 sm:h-72 bg-gray-800 overflow-hidden">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{exercise.name}</h1>
          <div className="flex items-center gap-2">
            {exercise.isCustom && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Custom</span>
            )}
            <button
              onClick={openEdit}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Edit exercise"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
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
      </div>

      {/* Video */}
      {ytData && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Video</h2>
          <div className="aspect-video rounded-lg overflow-hidden">
            <YouTubeLite videoId={ytData.videoId} startSeconds={ytData.startSeconds} title={`${exercise.name} video`} />
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

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Edit Exercise</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Muscle Groups</label>
                <input
                  type="text"
                  value={editForm.muscleGroups}
                  onChange={(e) => setEditForm({ ...editForm, muscleGroups: e.target.value })}
                  placeholder="e.g. chest, triceps"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Equipment</label>
                <input
                  type="text"
                  value={editForm.equipment}
                  onChange={(e) => setEditForm({ ...editForm, equipment: e.target.value })}
                  placeholder="e.g. barbell, bench"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Type</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="strength">Strength</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="bodyweight">Bodyweight</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Instructions</label>
                <textarea
                  value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">YouTube URL</label>
                <input
                  type="url"
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editForm.name.trim()}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
