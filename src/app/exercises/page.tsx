"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  equipment: string;
  type: string;
  instructions: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  isCustom: boolean;
}

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "quads", "hamstrings", "glutes", "calves", "abs", "core",
  "traps", "lats", "hip flexors", "adductors", "abductors",
];

const EQUIPMENT = [
  "barbell", "dumbbell", "cable", "machine", "bodyweight",
  "kettlebell", "resistance band", "smith machine", "ez bar",
  "pull-up bar", "bench", "trap bar",
];

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

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    muscleGroups: "",
    equipment: "",
    type: "weight_reps",
    instructions: "",
    videoUrl: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchExercises = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (muscleFilter) params.set("muscleGroup", muscleFilter);
    if (equipmentFilter) params.set("equipment", equipmentFilter);

    fetch(`/api/exercises?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setExercises(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, muscleFilter, equipmentFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchExercises, 300);
    return () => clearTimeout(timer);
  }, [fetchExercises]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isCustom: true,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setFormData({ name: "", muscleGroups: "", equipment: "", type: "weight_reps", instructions: "", videoUrl: "" });
        fetchExercises();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Exercise
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Muscle Groups</option>
          {MUSCLE_GROUPS.map((mg) => (
            <option key={mg} value={mg}>{mg.charAt(0).toUpperCase() + mg.slice(1)}</option>
          ))}
        </select>
        <select
          value={equipmentFilter}
          onChange={(e) => setEquipmentFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Equipment</option>
          {EQUIPMENT.map((eq) => (
            <option key={eq} value={eq}>{eq.charAt(0).toUpperCase() + eq.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No exercises found</p>
          <p className="text-sm mt-1">Try adjusting your filters or add a new exercise</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <Link
              key={ex.id}
              href={`/exercises/${ex.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group"
            >
              {ex.imageUrl && (
                <div className="bg-gray-800 flex items-center justify-center">
                  <img
                    src={ex.imageUrl}
                    alt={ex.name}
                    className="max-w-full max-h-56 object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-white group-hover:text-emerald-500 transition-colors">
                    {ex.name}
                  </h3>
                  {ex.isCustom && (
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Custom</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {ex.muscleGroups.split(",").map((mg) => mg.trim()).filter(Boolean).map((mg) => (
                    <span key={mg} className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(mg)}`}>
                      {mg}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ex.equipment.split(",").map((eq) => eq.trim()).filter(Boolean).map((eq) => (
                    <span key={eq} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                      {eq}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 capitalize">{ex.type.replace("_", " ")}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Exercise</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Muscle Groups * (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="chest, triceps, shoulders"
                  value={formData.muscleGroups}
                  onChange={(e) => setFormData({ ...formData, muscleGroups: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Equipment * (comma-separated)</label>
                <input
                  type="text"
                  required
                  placeholder="barbell, bench"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="weight_reps">Weight + Reps</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="time">Time</option>
                  <option value="cardio">Cardio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Instructions</label>
                <textarea
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Video URL</label>
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Exercise"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
