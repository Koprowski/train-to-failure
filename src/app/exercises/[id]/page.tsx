"use client";

import { use, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { canUploadExerciseImageSessionUser, isAdminSessionUser } from "@/lib/access";

const MUSCLE_GROUPS = [
  "abs", "abductors", "adductors", "back", "biceps", "calves",
  "chest", "forearms", "glutes", "hamstrings", "hip flexors",
  "lats", "obliques", "quads", "shoulders", "traps", "triceps",
];

const EQUIPMENT = [
  "barbell", "bench", "bodyweight", "cable", "dumbbell",
  "ez bar", "kettlebell", "machine", "pull-up bar",
  "resistance band", "smith machine", "trap bar",
];

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
  totalReps: number;
  sets: { setNumber: number; weightLbs: number | null; reps: number | null }[];
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isAdmin = isAdminSessionUser(session?.user);
  const canUploadExerciseImage = canUploadExerciseImageSessionUser(session?.user);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"maxWeight" | "estimated1RM" | "totalVolume" | "totalReps">("estimated1RM");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    muscleGroups: "",
    equipment: "",
    type: "",
    instructions: "",
    videoUrl: "",
  });
  const [showMusclePickerEdit, setShowMusclePickerEdit] = useState(false);
  const [muscleDraftEdit, setMuscleDraftEdit] = useState<string[]>([]);
  const [showEquipmentPickerEdit, setShowEquipmentPickerEdit] = useState(false);
  const [equipmentDraftEdit, setEquipmentDraftEdit] = useState<string[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imageUploadError, setImageUploadError] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogForm, setQuickLogForm] = useState({
    weightLbs: "",
    reps: "",
    timeSecs: "",
    rir: "",
    notes: "",
  });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const quickLogOpenedFromQueryRef = useRef(false);

  useEffect(() => {
    fetch(`/api/exercises/${id}`)
      .then((r) => r.json())
      .then((ex) => {
        if (!ex || ex.error) { setLoading(false); return; }
        setExercise(ex);
        return Promise.all([
          fetch(`/api/stats?exerciseId=${ex.id}`).then((r) => r.json()),
          fetch(`/api/exercises/favorites`).then((r) => r.json()),
        ]).then(([stats, favIds]) => {
          const h = stats?.history ?? [];
          setHistory(h);
          const hasWeight = h.some((e: HistoryEntry) => e.maxWeight > 0);
          setChartMetric(hasWeight ? "estimated1RM" : "totalReps");
          if (Array.isArray(favIds)) {
            setIsFavorite(favIds.includes(ex.id));
          }
          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (quickLogOpenedFromQueryRef.current || !exercise) return;
    if (searchParams.get("quickLog") !== "1") return;
    quickLogOpenedFromQueryRef.current = true;
    setShowQuickLog(true);
    router.replace(`/exercises/${id}`, { scroll: false });
  }, [exercise, id, router, searchParams]);

  const toggleFavorite = async () => {
    if (!exercise) return;
    setIsFavorite((prev) => !prev);
    try {
      await fetch("/api/exercises/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id }),
      });
    } catch {
      setIsFavorite((prev) => !prev);
    }
  };

  const handleQuickLog = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!exercise) return;
    const params = new URLSearchParams({ quickExercise: exercise.id });
    if (quickLogForm.weightLbs) params.set("weight", quickLogForm.weightLbs);
    if (quickLogForm.reps) params.set("reps", quickLogForm.reps);
    if (quickLogForm.timeSecs) params.set("time", quickLogForm.timeSecs);
    if (quickLogForm.rir) params.set("rir", quickLogForm.rir);
    if (quickLogForm.notes) params.set("notes", quickLogForm.notes);
    setShowQuickLog(false);
    router.push(`/workouts/new?${params.toString()}`);
  };

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
    setSelectedImageFile(null);
    setSelectedImageName("");
    setImageUploadError("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setEditing(true);
  }

  async function saveEdit() {
    if (!exercise) return;
    const canManageCurrentExercise = (exercise.isCustom && exercise.userId) || (isAdmin && !exercise.isCustom);
    if (!canManageCurrentExercise) return;
    setSaving(true);
    setImageUploadError("");
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to save exercise");
        return;
      }

      let updatedExercise = await res.json();

      if (selectedImageFile) {
        if (!canUploadExerciseImage) {
          setExercise(updatedExercise);
          setImageUploadError("Image uploads are currently available to admins and paid accounts.");
          return;
        }

        const formData = new FormData();
        formData.append("file", selectedImageFile);

        const uploadRes = await fetch(`/api/exercises/${exercise.id}/image`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => null);
          setExercise(updatedExercise);
          setImageUploadError(data?.error || "Failed to upload exercise image");
          return;
        }

        updatedExercise = await uploadRes.json();
      }

      setExercise(updatedExercise);
      setSelectedImageFile(null);
      setSelectedImageName("");
      setImageUploadError("");
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedImageFile(file);
    setSelectedImageName(file?.name ?? "");
    setImageUploadError("");
  }

  const deleteExercise = async () => {
    if (!exercise) return;
    const canManageCurrentExercise = (exercise.isCustom && exercise.userId) || (isAdmin && !exercise.isCustom);
    if (!canManageCurrentExercise) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/exercises/${exercise.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/exercises");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete exercise");
        setDeleting(false);
      }
    } catch (err) {
      console.error("Failed to delete exercise:", err);
      setDeleting(false);
    }
  };

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

  const canManageExercise = (exercise.isCustom && Boolean(exercise.userId)) || (isAdmin && !exercise.isCustom);
  const canEditExerciseImage = canManageExercise && canUploadExerciseImage;
  const muscleGroups = exercise.muscleGroups.split(",").map((g) => g.trim()).filter((g) => g && g.toLowerCase() !== "core");
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

  const hasWeightData = history.some((h) => h.maxWeight > 0);
  const chartLabel = chartMetric === "maxWeight" ? "Max Weight (lbs)" : chartMetric === "estimated1RM" ? "Est. 1RM (lbs)" : chartMetric === "totalVolume" ? "Total Volume (lbs)" : "Total Reps";

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
          <div className="bg-white flex items-center justify-center">
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="max-w-full max-h-[30rem] object-contain"
            />
          </div>
        )}
        <div className="p-6">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{exercise.name}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorite ? "#ef4444" : "none"} stroke={isFavorite ? "#ef4444" : "currentColor"} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
            </button>
            {exercise.isCustom && (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Custom</span>
            )}
            <button
              onClick={() => setShowQuickLog(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Quick Log
            </button>
            {canManageExercise && (
              <button
                onClick={openEdit}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Edit exercise"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
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
            {(["estimated1RM", "maxWeight", "totalVolume", "totalReps"] as const).map((metric) => {
              const isWeightMetric = metric !== "totalReps";
              const disabled = isWeightMetric && !hasWeightData;
              return (
                <button
                  key={metric}
                  onClick={() => !disabled && setChartMetric(metric)}
                  disabled={disabled}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    chartMetric === metric
                      ? "bg-emerald-500 text-white"
                      : disabled
                        ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {metric === "maxWeight" ? "Weight" : metric === "estimated1RM" ? "Est. 1RM" : metric === "totalVolume" ? "Volume" : "Reps"}
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
              <YAxis stroke="#6b7280" fontSize={12} domain={[(min: number) => Math.max(0, Math.floor(min * 0.9)), (max: number) => Math.ceil(max * 1.05)]} />
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
                  <th className="text-right py-2 pr-4">Sets</th>
                  <th className="text-right py-2 pr-4">Reps</th>
                  {hasWeightData && <th className="text-right py-2 pr-4">Max Weight</th>}
                  {hasWeightData && <th className="text-right py-2 pr-4">Volume</th>}
                  {hasWeightData && <th className="text-right py-2">Est. 1RM</th>}
                </tr>
              </thead>
              <tbody>
                {history.slice().reverse().slice(0, 20).map((h) => (
                  <tr key={h.date} className="border-b border-gray-800/50">
                    <td className="py-2.5 pr-4 text-gray-300">{h.date}</td>
                    <td className="py-2.5 pr-4 text-gray-300">{h.workoutName}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex justify-end gap-2">
                        {h.sets.map((set) => (
                          <div key={set.setNumber} className="min-w-[32px] text-center text-xs">
                            <p className="font-medium text-gray-300">{set.weightLbs ?? "BW"}</p>
                            <p className="text-gray-400">{set.reps ?? 0}</p>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">{h.totalReps}</td>
                    {hasWeightData && <td className="py-2.5 pr-4 text-right">{h.maxWeight} lbs</td>}
                    {hasWeightData && <td className="py-2.5 pr-4 text-right">{h.totalVolume.toLocaleString()} lbs</td>}
                    {hasWeightData && <td className="py-2.5 text-right text-emerald-500">{h.estimated1RM} lbs</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {canManageExercise && showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Exercise</h2>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete &ldquo;{exercise.name}&rdquo;? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={deleteExercise}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {canManageExercise && editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Exercise</h2>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
                <button
                  type="button"
                  onClick={() => {
                    setMuscleDraftEdit(editForm.muscleGroups.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
                    setShowMusclePickerEdit(true);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left text-white focus:outline-none focus:border-emerald-500"
                >
                  {editForm.muscleGroups || <span className="text-gray-500">Select muscle groups...</span>}
                </button>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Equipment</label>
                <button
                  type="button"
                  onClick={() => {
                    setEquipmentDraftEdit(editForm.equipment.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
                    setShowEquipmentPickerEdit(true);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left text-white focus:outline-none focus:border-emerald-500"
                >
                  {editForm.equipment || <span className="text-gray-500">Select equipment...</span>}
                </button>
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
                  rows={2}
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
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exercise GIF / Image</label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/gif,image/png,image/jpeg,image/webp,image/avif"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <div className="rounded-lg border border-gray-700 bg-gray-800/70 p-3">
                  <div className="flex items-start gap-3">
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={`${exercise.name} preview`}
                        className="h-16 w-16 rounded-lg border border-gray-700 bg-gray-900 object-contain"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-700 bg-gray-900 text-[11px] text-gray-500">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-200">
                        {selectedImageName || "Choose a new GIF or image to replace the current asset."}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        GIF, PNG, JPG, WEBP, and AVIF are supported.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={!canEditExerciseImage}
                      className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-white transition-colors hover:border-gray-500 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {exercise.imageUrl ? "Replace File" : "Choose File"}
                    </button>
                    {selectedImageFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedImageFile(null);
                          setSelectedImageName("");
                          setImageUploadError("");
                          if (imageInputRef.current) {
                            imageInputRef.current.value = "";
                          }
                        }}
                        className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                  {!canEditExerciseImage && (
                    <p className="mt-3 text-xs text-amber-300">
                      Image uploads are reserved for admins now and paid accounts once that access is unlocked.
                    </p>
                  )}
                  {imageUploadError && (
                    <p className="mt-3 text-sm text-red-400">{imageUploadError}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-6">
              <div>
                {canManageExercise && (
                  <button
                    onClick={() => {
                      setEditing(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete Exercise
                  </button>
                )}
              </div>
              <div className="flex gap-3">
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
        </div>
      )}

      {/* Muscle Group Picker (stacked above edit modal) */}
      {showMusclePickerEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMusclePickerEdit(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Muscle Groups</h3>
              <button onClick={() => setShowMusclePickerEdit(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map((mg) => {
                const selected = muscleDraftEdit.includes(mg);
                return (
                  <button
                    key={mg}
                    onClick={() =>
                      setMuscleDraftEdit((prev) =>
                        selected ? prev.filter((m) => m !== mg) : [...prev, mg]
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      selected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {mg.charAt(0).toUpperCase() + mg.slice(1)}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setMuscleDraftEdit([])}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setEditForm((prev) => ({ ...prev, muscleGroups: muscleDraftEdit.join(",") }));
                  setShowMusclePickerEdit(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Apply{muscleDraftEdit.length > 0 ? ` (${muscleDraftEdit.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Picker (stacked above edit modal) */}
      {showEquipmentPickerEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowEquipmentPickerEdit(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Equipment</h3>
              <button onClick={() => setShowEquipmentPickerEdit(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT.map((eq) => {
                const selected = equipmentDraftEdit.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() =>
                      setEquipmentDraftEdit((prev) =>
                        selected ? prev.filter((e) => e !== eq) : [...prev, eq]
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      selected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEquipmentDraftEdit([])}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setEditForm((prev) => ({ ...prev, equipment: equipmentDraftEdit.join(",") }));
                  setShowEquipmentPickerEdit(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Apply{equipmentDraftEdit.length > 0 ? ` (${equipmentDraftEdit.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Log Modal */}
      {showQuickLog && exercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowQuickLog(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Quick Log</h2>
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-300">
                    Set 1 only
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400">
                  Enter the first set here. You can add the rest in the workout screen.
                </p>
              </div>
              <button onClick={() => setShowQuickLog(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 mb-4">
              {exercise.imageUrl ? (
                <img src={exercise.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-700" />
              )}
              <div>
                <p className="font-medium text-white">{exercise.name}</p>
                <p className="text-xs text-gray-500">{exercise.muscleGroups}</p>
              </div>
            </div>
            <form onSubmit={handleQuickLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={quickLogForm.weightLbs}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, weightLbs: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={quickLogForm.reps}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, reps: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Time (sec)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={quickLogForm.timeSecs}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, timeSecs: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    <span className="group relative inline-flex items-center gap-1 cursor-help">
                      RIR
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-48 px-3 py-2 text-xs font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                        Reps in Reserve (0-10). How many more reps you could do. 0 = failure.
                      </span>
                    </span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="10"
                    step="0.5"
                    value={quickLogForm.rir}
                    onChange={(e) => setQuickLogForm({ ...quickLogForm, rir: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={quickLogForm.notes}
                  onChange={(e) => setQuickLogForm({ ...quickLogForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickLog(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Log Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






