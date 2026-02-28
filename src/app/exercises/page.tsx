"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const Body = dynamic(
  () => import("react-muscle-highlighter"),
  { ssr: false }
);

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
  "abs", "abductors", "adductors", "back", "biceps", "calves",
  "chest", "core", "forearms", "glutes", "hamstrings", "hip flexors",
  "lats", "quads", "shoulders", "traps", "triceps",
];

const EQUIPMENT = [
  "barbell", "bench", "bodyweight", "cable", "dumbbell",
  "ez bar", "kettlebell", "machine", "pull-up bar",
  "resistance band", "smith machine", "trap bar",
];

const EQUIPMENT_ICONS: Record<string, React.ReactNode> = {
  barbell: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="1" y="9" width="3" height="6" rx="0.5" />
      <rect x="4" y="10.5" width="2" height="3" rx="0.5" />
      <rect x="20" y="9" width="3" height="6" rx="0.5" />
      <rect x="18" y="10.5" width="2" height="3" rx="0.5" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  ),
  bench: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="3" y="10" width="18" height="3" rx="1" />
      <line x1="5" y1="13" x2="5" y2="19" />
      <line x1="19" y1="13" x2="19" y2="19" />
      <line x1="3" y1="19" x2="7" y2="19" />
      <line x1="17" y1="19" x2="21" y2="19" />
      <line x1="12" y1="10" x2="12" y2="5" />
      <line x1="9" y1="5" x2="15" y2="5" />
    </svg>
  ),
  bodyweight: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 9v5M12 14l-3 6M12 14l3 6M8 11h8" />
    </svg>
  ),
  cable: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <line x1="12" y1="6" x2="12" y2="16" strokeDasharray="2 2" />
      <rect x="8" y="16" width="8" height="4" rx="1" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  ),
  dumbbell: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="2" y="9.5" width="4" height="5" rx="0.5" />
      <rect x="18" y="9.5" width="4" height="5" rx="0.5" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  ),
  "ez bar": (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="1" y="10" width="3" height="4" rx="0.5" />
      <rect x="20" y="10" width="3" height="4" rx="0.5" />
      <path d="M4 12h3l2-1.5h6l2 1.5h3" />
    </svg>
  ),
  kettlebell: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M9 6a3 3 0 016 0" />
      <circle cx="12" cy="15" r="5" />
      <line x1="10" y1="15" x2="14" y2="15" />
    </svg>
  ),
  machine: (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <line x1="12" y1="13" x2="12" y2="17" />
      <line x1="10" y1="17" x2="14" y2="17" />
    </svg>
  ),
  "pull-up bar": (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <line x1="2" y1="5" x2="22" y2="5" />
      <line x1="4" y1="5" x2="4" y2="2" />
      <line x1="20" y1="5" x2="20" y2="2" />
      <circle cx="12" cy="9" r="1.5" />
      <path d="M12 11v4M9 12l3-1 3 1M12 15l-2 4M12 15l2 4" />
    </svg>
  ),
  "resistance band": (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M6 4c0 0-2 8 0 16" />
      <path d="M18 4c0 0 2 8 0 16" />
      <path d="M6 8c4-2 8-2 12 0" />
      <path d="M6 16c4 2 8 2 12 0" />
    </svg>
  ),
  "smith machine": (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <line x1="5" y1="2" x2="5" y2="22" />
      <line x1="19" y1="2" x2="19" y2="22" />
      <line x1="3" y1="22" x2="7" y2="22" />
      <line x1="17" y1="22" x2="21" y2="22" />
      <rect x="7" y="11" width="2" height="2" rx="0.5" />
      <rect x="15" y="11" width="2" height="2" rx="0.5" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  ),
  "trap bar": (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <polygon points="12,4 20,9 20,15 12,20 4,15 4,9" />
      <line x1="8" y1="11" x2="8" y2="13" />
      <line x1="16" y1="11" x2="16" y2="13" />
    </svg>
  ),
};

// Map react-muscle-highlighter slugs to app muscle group names
const SLUG_TO_MUSCLE: Record<string, string[]> = {
  abs: ["abs", "core"],
  adductors: ["adductors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  deltoids: ["shoulders"],
  forearm: ["forearms"],
  gluteal: ["glutes"],
  hamstring: ["hamstrings"],
  obliques: ["core"],
  quadriceps: ["quads"],
  trapezius: ["traps"],
  triceps: ["triceps"],
  "upper-back": ["back", "lats"],
  "lower-back": ["back"],
};

// Reverse map: app muscle group -> highlight slugs
const MUSCLE_TO_SLUGS: Record<string, string[]> = {};
for (const [slug, muscles] of Object.entries(SLUG_TO_MUSCLE)) {
  for (const m of muscles) {
    if (!MUSCLE_TO_SLUGS[m]) MUSCLE_TO_SLUGS[m] = [];
    if (!MUSCLE_TO_SLUGS[m].includes(slug)) MUSCLE_TO_SLUGS[m].push(slug);
  }
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

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string[]>([]);
  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [muscleDraft, setMuscleDraft] = useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState<string[]>([]);
  const [showEquipmentPicker, setShowEquipmentPicker] = useState(false);
  const [equipmentDraft, setEquipmentDraft] = useState<string[]>([]);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
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
  const [showSearch, setShowSearch] = useState(false);
  // Swipe-to-flip state
  const [dragRotation, setDragRotation] = useState(0); // 0-180 degrees
  const [isSnapping, setIsSnapping] = useState(false); // true during snap-back animation
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swipeLocked = useRef<"horizontal" | "vertical" | null>(null);
  const SWIPE_WIDTH = 150; // pixels for a full 180-degree rotation

  const flipBody = useCallback(() => {
    // Animated flip for button taps
    setIsSnapping(true);
    setDragRotation(180);
    setTimeout(() => {
      setBodySide((prev) => (prev === "front" ? "back" : "front"));
      setDragRotation(0);
      setIsSnapping(false);
    }, 300);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSnapping) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeLocked.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || isSnapping) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Lock direction on first significant movement
    if (swipeLocked.current === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }

    if (swipeLocked.current !== "horizontal") return;

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();

    // Map pixel distance to 0-180 degree rotation
    const rotation = Math.min(180, Math.max(0, (Math.abs(dx) / SWIPE_WIDTH) * 180));
    setDragRotation(rotation);
  };

  const handleTouchEnd = () => {
    const wasHorizontal = swipeLocked.current === "horizontal";
    touchStart.current = null;
    swipeLocked.current = null;

    // Always snap back to flat if not a horizontal swipe or no rotation
    if (!wasHorizontal || dragRotation === 0) {
      if (dragRotation !== 0) {
        setIsSnapping(true);
        setDragRotation(0);
        setTimeout(() => setIsSnapping(false), 200);
      }
      return;
    }

    if (dragRotation >= 90) {
      // Past halfway -- complete the flip
      setIsSnapping(true);
      setDragRotation(180);
      setTimeout(() => {
        setBodySide((prev) => (prev === "front" ? "back" : "front"));
        setDragRotation(0);
        setIsSnapping(false);
      }, 200);
    } else {
      // Snap back
      setIsSnapping(true);
      setDragRotation(0);
      setTimeout(() => setIsSnapping(false), 200);
    }
  };

  const fetchExercises = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);

    fetch(`/api/exercises?${params}`)
      .then((r) => r.json())
      .then((data) => {
        let list = Array.isArray(data) ? data : [];
        if (muscleFilter.length > 0) {
          list = list.filter((ex: Exercise) => {
            const exGroups = ex.muscleGroups.split(",").map((g) => g.trim().toLowerCase());
            return muscleFilter.some((f) => exGroups.includes(f.toLowerCase()));
          });
        }
        if (equipmentFilter.length > 0) {
          list = list.filter((ex: Exercise) => {
            const exEquip = ex.equipment.split(",").map((e) => e.trim().toLowerCase());
            return equipmentFilter.some((f) => exEquip.includes(f.toLowerCase()));
          });
        }
        setExercises(list);
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
    <div className="space-y-4">
      {/* Title row with + New and filter icons */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Exercise Library</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
        <div className="flex items-center gap-1 ml-auto">
          {/* Muscle group filter - person icon */}
          <button
            onClick={() => { setMuscleDraft([...muscleFilter]); setShowMusclePicker(true); }}
            className={`relative p-2 rounded-lg transition-colors ${muscleFilter.length > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 hover:text-white"}`}
            title={muscleFilter.length > 0 ? `Muscles: ${muscleFilter.join(", ")}` : "Filter by muscle group"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {muscleFilter.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{muscleFilter.length}</span>
            )}
          </button>
          {/* Equipment filter - dumbbell icon */}
          <button
            onClick={() => { setEquipmentDraft([...equipmentFilter]); setShowEquipmentPicker(true); }}
            className={`relative p-2 rounded-lg transition-colors ${equipmentFilter.length > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 hover:text-white"}`}
            title={equipmentFilter.length > 0 ? `Equipment: ${equipmentFilter.join(", ")}` : "Filter by equipment"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.27 4.74a1 1 0 0 0-1.42 0l-1.53 1.53-1.06-1.06a1.5 1.5 0 0 0-2.12 0l-.71.71a1.5 1.5 0 0 0 0 2.12l.35.36-4.95 4.95-.35-.36a1.5 1.5 0 0 0-2.12 0l-.71.71a1.5 1.5 0 0 0 0 2.12l1.06 1.06-1.53 1.53a1 1 0 1 0 1.42 1.42l1.53-1.53 1.06 1.06a1.5 1.5 0 0 0 2.12 0l.71-.71a1.5 1.5 0 0 0 0-2.12l-.35-.36 4.95-4.95.35.36a1.5 1.5 0 0 0 2.12 0l.71-.71a1.5 1.5 0 0 0 0-2.12l-1.06-1.06 1.53-1.53a1 1 0 0 0 0-1.42z" />
            </svg>
            {equipmentFilter.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{equipmentFilter.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Body Map + Grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Body Map */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { if (bodySide !== "front") flipBody(); }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${bodySide === "front" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              Front
            </button>
            <button
              onClick={() => { if (bodySide !== "back") flipBody(); }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${bodySide === "back" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              Back
            </button>
            {/* Search icon */}
            <button
              onClick={() => setShowSearch(true)}
              className="px-2 py-1 text-xs rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Search exercises"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <div
            className="cursor-pointer"
            style={{ perspective: "800px" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              style={{
                transition: isSnapping ? "transform 0.2s ease-out" : "none",
                transform: `rotateY(${dragRotation <= 90 ? dragRotation : 180 - dragRotation}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
            <Body
              side={dragRotation >= 90 ? (bodySide === "front" ? "back" : "front") : bodySide}
              gender="male"
              scale={1.2}
              border="#4b5563"
              defaultFill="#1f2937"
              colors={["#10b981", "#34d399"]}
              data={
                muscleFilter.length > 0
                  ? muscleFilter.flatMap((m) => (MUSCLE_TO_SLUGS[m] || []).map((slug) => ({ slug: slug as never, intensity: 2 })))
                  : []
              }
              onBodyPartPress={(part: { slug?: string }) => {
                if (!part.slug) return;
                const muscles = SLUG_TO_MUSCLE[part.slug];
                if (!muscles) return;
                const target = muscles[0];
                setMuscleFilter((prev) =>
                  prev.includes(target) ? prev.filter((m) => m !== target) : [...prev, target]
                );
              }}
            />
            </div>
          </div>
          {muscleFilter.length > 0 && (
            <button
              onClick={() => setMuscleFilter([])}
              className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear: {muscleFilter.join(", ")}
            </button>
          )}
        </div>

        {/* Exercise Grid */}
        <div className="flex-1 space-y-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {exercises.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/exercises/${ex.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group"
                >
                  {ex.imageUrl && (
                    <div className="bg-white flex items-center justify-center">
                      <img
                        src={ex.imageUrl}
                        alt={ex.name}
                        loading="lazy"
                        className="max-w-full max-h-[17.5rem] object-contain group-hover:scale-105 transition-transform duration-300"
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
        </div>
      </div>

      {/* Muscle Group Picker Modal */}
      {showMusclePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMusclePicker(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Muscle Groups</h3>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map((mg) => {
                const selected = muscleDraft.includes(mg);
                return (
                  <button
                    key={mg}
                    onClick={() =>
                      setMuscleDraft((prev) =>
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
                onClick={() => { setMuscleDraft([]); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => { setMuscleFilter(muscleDraft); setShowMusclePicker(false); }}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Apply{muscleDraft.length > 0 ? ` (${muscleDraft.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Picker Modal */}
      {showEquipmentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowEquipmentPicker(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Equipment</h3>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT.map((eq) => {
                const selected = equipmentDraft.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() =>
                      setEquipmentDraft((prev) =>
                        selected ? prev.filter((e) => e !== eq) : [...prev, eq]
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center gap-2 ${
                      selected
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                        : "bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {EQUIPMENT_ICONS[eq]}
                    {eq.charAt(0).toUpperCase() + eq.slice(1)}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEquipmentDraft([]); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => { setEquipmentFilter(equipmentDraft); setShowEquipmentPicker(false); }}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Apply{equipmentDraft.length > 0 ? ` (${equipmentDraft.length})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60" onClick={() => { setShowSearch(false); }}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                autoFocus
                placeholder="Search exercises..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {search && (
              <div className="mt-3 border-t border-gray-800 pt-3 max-h-64 overflow-y-auto space-y-1">
                {exercises.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No exercises found</p>
                ) : (
                  exercises.map((ex) => (
                    <Link
                      key={ex.id}
                      href={`/exercises/${ex.id}`}
                      className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-white text-sm transition-colors"
                      onClick={() => setShowSearch(false)}
                    >
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-gray-500 ml-2 text-xs">{ex.muscleGroups}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
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
