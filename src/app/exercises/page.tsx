"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { slugify } from "@/lib/slugify";

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
  "chest", "forearms", "glutes", "hamstrings", "hip flexors",
  "lats", "obliques", "quads", "shoulders", "traps", "triceps",
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
  abs: ["abs"],
  adductors: ["adductors", "hip flexors"],
  biceps: ["biceps"],
  calves: ["calves"],
  chest: ["chest"],
  deltoids: ["shoulders"],
  forearm: ["forearms"],
  gluteal: ["glutes", "abductors"],
  hamstring: ["hamstrings"],
  obliques: ["obliques"],
  quadriceps: ["quads", "hip flexors"],
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

// Muscle label positions: [side, labelTopPercent, muscleName, muscleXPercent, muscleYPercent]
// muscleX/Y are target points on the body diagram (% of body width/height)
// bodyX/bodyY are percentages of the BODY SVG itself (not the container).
// A useEffect measures the actual SVG bounding box and maps these to container coords.
const FRONT_LABELS: [string, number, string, number, number][] = [
  ["left", 10, "traps",       45, 20],
  ["left", 20, "shoulders",   18, 23],
  ["left", 30, "chest",       35, 30],
  ["left", 38, "biceps",      12, 37],
  ["left", 46, "obliques",    32, 44],
  ["left", 62, "quads",       38, 64],
  ["right", 30, "abs",        50, 37],
  ["right", 38, "forearms",   83, 46],
  ["right", 50, "hip flexors",58, 52],
  ["right", 62, "adductors",  48, 59],
  ["right", 78, "calves",     58, 80],
];

const BACK_LABELS: [string, number, string, number, number][] = [
  ["left", 10, "traps",       45, 20],
  ["left", 20, "shoulders",   18, 23],
  ["left", 30, "back",        50, 30],
  ["left", 40, "lats",        28, 36],
  ["left", 52, "glutes",      45, 50],
  ["left", 65, "hamstrings",  42, 65],
  ["right", 30, "triceps",    82, 34],
  ["right", 40, "forearms",   85, 46],
  ["right", 52, "abductors",  60, 50],
  ["right", 78, "calves",     58, 80],
];

function properCase(s: string) {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
  obliques: "bg-violet-500/20 text-violet-400",
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
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
  // Refs + state for measuring body SVG position within diagram container
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const bodyDivRef = useRef<HTMLDivElement>(null);
  const [bodyPos, setBodyPos] = useState({ left: 28, top: 0, width: 44, height: 100 });
  // Interactive page-turn flip via touch overlay
  const flipContainerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    locked: boolean; // true = horizontal drag confirmed
    dismissed: boolean; // true = vertical scroll, ignore
    containerWidth: number;
  } | null>(null);
  const flipBody = useCallback((animated = false) => {
    if (animated && flipContainerRef.current) {
      const el = flipContainerRef.current;
      el.style.transition = "transform 0.15s ease-in";
      el.style.transform = "rotateY(90deg)";
      setTimeout(() => {
        setBodySide((prev) => (prev === "front" ? "back" : "front"));
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.15s ease-out";
          el.style.transform = "rotateY(0deg)";
        });
      }, 150);
    } else {
      setBodySide((prev) => (prev === "front" ? "back" : "front"));
    }
  }, []);

  // Apply rotation directly to DOM for smooth tracking
  const setRotation = useCallback((deg: number) => {
    if (flipContainerRef.current) {
      flipContainerRef.current.style.transform = `rotateY(${deg}deg)`;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = flipContainerRef.current;
    if (!el) return;
    dragState.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      locked: false,
      dismissed: false,
      containerWidth: el.offsetWidth,
    };
    el.style.transition = "none";
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const ds = dragState.current;
    if (!ds || ds.dismissed) return;
    const dx = e.touches[0].clientX - ds.startX;
    const dy = e.touches[0].clientY - ds.startY;

    // Lock direction after 10px of movement
    if (!ds.locked) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        ds.dismissed = true; // vertical scroll, bail
        setRotation(0);
        return;
      }
      if (Math.abs(dx) > 10) {
        ds.locked = true;
        // Show overlay to capture all touch events (prevents Body from stealing them)
        if (overlayRef.current) overlayRef.current.style.display = "block";
      } else {
        return; // not enough movement yet
      }
    }

    e.preventDefault(); // prevent scroll during horizontal drag

    // Map drag distance to rotation: full container width = 180 degrees
    const maxDeg = 180;
    const rotation = (dx / ds.containerWidth) * maxDeg;
    // Clamp to [-180, 180]
    const clamped = Math.max(-maxDeg, Math.min(maxDeg, rotation));
    setRotation(clamped);

    // Content swap happens on release, not during drag
  }, [setRotation]);

  const handleTouchEnd = useCallback(() => {
    const ds = dragState.current;
    dragState.current = null;
    // Hide overlay
    if (overlayRef.current) overlayRef.current.style.display = "none";

    if (!ds || ds.dismissed || !ds.locked) {
      // No horizontal drag -- snap back
      if (flipContainerRef.current) {
        flipContainerRef.current.style.transition = "transform 0.25s ease-out";
        setRotation(0);
      }
      return;
    }

    const el = flipContainerRef.current;
    if (!el) return;

    // Get current rotation from the transform
    const currentTransform = el.style.transform;
    const match = currentTransform.match(/rotateY\(([^)]+)deg\)/);
    const currentDeg = match ? parseFloat(match[1]) : 0;
    const absDeg = Math.abs(currentDeg);

    if (absDeg > 60) {
      // Commit the flip: animate to 90, swap side, animate out from 90 to 0
      const direction = currentDeg > 0 ? 1 : -1;
      const remainingTo90 = 90 - absDeg;
      const timeToEdge = Math.max(50, (remainingTo90 / 90) * 200);
      el.style.transition = `transform ${timeToEdge}ms ease-in`;
      setRotation(direction * 90);

      setTimeout(() => {
        flipBody();
        // Keep at edge while React renders new content
        setRotation(direction * 90);
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.2s ease-out";
          setRotation(0);
        });
      }, timeToEdge);
    } else {
      // Snap back to original position
      const snapTime = Math.max(100, (absDeg / 60) * 250);
      el.style.transition = `transform ${snapTime}ms ease-out`;
      setRotation(0);
    }
  }, [flipBody, setRotation]);

  const onBodyPartPress = useCallback((part: { slug?: string }) => {
    if (!part.slug) return;
    const muscles = SLUG_TO_MUSCLE[part.slug];
    if (!muscles) return;
    const target = muscles[0];
    setMuscleFilter((prev) =>
      prev.includes(target) ? prev.filter((m) => m !== target) : [...prev, target]
    );
  }, []);

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

  const bodyMapElement = useMemo(() => (
    <Body
      side={bodySide}
      gender="male"
      scale={1.0}
      border="#4b5563"
      defaultFill="#1f2937"
      colors={["#10b981", "#34d399"]}
      data={
        muscleFilter.length > 0
          ? muscleFilter.flatMap((m) => (MUSCLE_TO_SLUGS[m] || []).map((slug) => ({ slug: slug as never, intensity: 2 })))
          : []
      }
      onBodyPartPress={onBodyPartPress}
    />
  ), [bodySide, muscleFilter, onBodyPartPress]);

  // Fetch favorites on mount
  useEffect(() => {
    fetch("/api/exercises/favorites")
      .then((r) => r.ok ? r.json() : [])
      .then((ids) => { if (Array.isArray(ids)) setFavoriteIds(new Set(ids)); })
      .catch(() => {});
  }, []);

  // Measure body SVG position within the diagram container
  useEffect(() => {
    const measure = () => {
      const container = diagramContainerRef.current;
      const bodyDiv = bodyDivRef.current;
      if (!container || !bodyDiv) return;
      const cRect = container.getBoundingClientRect();
      if (cRect.width === 0 || cRect.height === 0) return;
      const svg = bodyDiv.querySelector("svg");
      if (!svg) return;
      const sRect = svg.getBoundingClientRect();
      setBodyPos({
        left: ((sRect.left - cRect.left) / cRect.width) * 100,
        top: ((sRect.top - cRect.top) / cRect.height) * 100,
        width: (sRect.width / cRect.width) * 100,
        height: (sRect.height / cRect.height) * 100,
      });
    };
    const t1 = setTimeout(measure, 150);
    const t2 = setTimeout(measure, 400);
    const observer = new ResizeObserver(() => measure());
    if (diagramContainerRef.current) observer.observe(diagramContainerRef.current);
    return () => { clearTimeout(t1); clearTimeout(t2); observer.disconnect(); };
  }, [bodySide]);

  const toggleFavorite = async (exerciseId: string) => {
    // Optimistic update
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
      // Revert on failure
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (next.has(exerciseId)) next.delete(exerciseId);
        else next.add(exerciseId);
        return next;
      });
    }
  };

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

  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      {/* Title row with + New right-justified */}
      <div className="flex items-center justify-between mb-4">
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
      </div>

      {/* Sticky toolbar - stays fixed below navbar on scroll */}
      <div className="sticky top-14 z-30 bg-black/90 backdrop-blur-sm -mx-4 px-4 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center">
          {/* Left: scroll arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Scroll to top"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Scroll to bottom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {/* Center: Front/Back */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <button
              onClick={() => { if (bodySide !== "front") flipBody(true); }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${bodySide === "front" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              Front
            </button>
            <button
              onClick={() => { if (bodySide !== "back") flipBody(true); }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${bodySide === "back" ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              Back
            </button>
          </div>
          {/* Right: search, muscle, equipment icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Search exercises"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => { setMuscleDraft([...muscleFilter]); setShowMusclePicker(true); }}
              className={`relative p-2 rounded-lg transition-colors ${muscleFilter.length > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-gray-400 hover:text-white"}`}
              title={muscleFilter.length > 0 ? `Muscles: ${muscleFilter.join(", ")}` : "Filter by muscle group"}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" />
                <path d="M15 14a5 5 0 0 0-7.584 2" />
                <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" />
              </svg>
              {muscleFilter.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{muscleFilter.length}</span>
              )}
            </button>
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
      </div>

      {/* Inline Search Bar */}
      {showSearch && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
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
          <button
            onClick={() => { setSearch(""); setShowSearch(false); }}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Body Map + Grid */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Body Map with Slicer Labels */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-2 py-4 flex flex-col items-center shrink-0">
          {/* Container: labels + body + SVG lines */}
          <div ref={diagramContainerRef} className="relative" style={{ width: "24rem", height: "24rem" }}>
            {/* SVG connecting lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS).map(([side, labelTop, muscle, muscleX, muscleY]) => {
                const active = muscleFilter.includes(muscle);
                const labelEdgeX = side === "left" ? bodyPos.left : bodyPos.left + bodyPos.width;
                const targetX = bodyPos.left + (muscleX / 100) * bodyPos.width;
                const targetY = bodyPos.top + (muscleY / 100) * bodyPos.height;
                return (
                  <line
                    key={`${side}-${muscle}`}
                    x1={`${labelEdgeX}%`}
                    y1={`${labelTop}%`}
                    x2={`${targetX}%`}
                    y2={`${targetY}%`}
                    stroke={active ? "#3b82f6" : "#374151"}
                    strokeWidth={active ? 1.5 : 0.75}
                    strokeDasharray={active ? "none" : "3 2"}
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* Left labels */}
            <div className="absolute left-0 top-0 bottom-0 z-30" style={{ width: `${bodyPos.left}%` }}>
              {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS)
                .filter(([side]) => side === "left")
                .map(([, top, muscle]) => {
                  const active = muscleFilter.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      onClick={() =>
                        setMuscleFilter((prev) =>
                          prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                        )
                      }
                      className={`absolute right-0 text-sm font-semibold transition-colors whitespace-nowrap ${
                        active ? "text-blue-400" : "text-white/70 hover:text-white"
                      }`}
                      style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                    >
                      <span className={`px-2.5 py-1 rounded ${active ? "bg-blue-500/20 border border-blue-500/40" : "bg-gray-800/80"}`}>
                        {properCase(muscle)}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Body diagram (centered) */}
            <div
              ref={bodyDivRef}
              className="absolute cursor-pointer"
              style={{ left: "20%", right: "20%", top: 0, bottom: 0 }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div style={{ perspective: "800px", display: "flex", justifyContent: "center" }}>
                <div
                  ref={overlayRef}
                  style={{ display: "none", position: "absolute", inset: 0, zIndex: 10 }}
                />
                <div
                  ref={flipContainerRef}
                  style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                >
                  {bodyMapElement}
                </div>
              </div>
            </div>

            {/* Right labels */}
            <div className="absolute right-0 top-0 bottom-0 z-30" style={{ width: `${100 - bodyPos.left - bodyPos.width}%` }}>
              {(bodySide === "front" ? FRONT_LABELS : BACK_LABELS)
                .filter(([side]) => side === "right")
                .map(([, top, muscle]) => {
                  const active = muscleFilter.includes(muscle);
                  return (
                    <button
                      key={muscle}
                      onClick={() =>
                        setMuscleFilter((prev) =>
                          prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
                        )
                      }
                      className={`absolute left-0 text-sm font-semibold transition-colors whitespace-nowrap ${
                        active ? "text-blue-400" : "text-white/70 hover:text-white"
                      }`}
                      style={{ top: `${top}%`, transform: "translateY(-50%)" }}
                    >
                      <span className={`px-2.5 py-1 rounded ${active ? "bg-blue-500/20 border border-blue-500/40" : "bg-gray-800/80"}`}>
                        {properCase(muscle)}
                      </span>
                    </button>
                  );
                })}
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
                  href={`/exercises/${slugify(ex.name)}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group relative"
                >
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(ex.id); }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                    aria-label={favoriteIds.has(ex.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={favoriteIds.has(ex.id) ? "#ef4444" : "none"} stroke={favoriteIds.has(ex.id) ? "#ef4444" : "currentColor"} strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                  {ex.imageUrl && (
                    <div className="bg-white flex items-center justify-center overflow-hidden">
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
                    <div className="flex items-start justify-between gap-2 mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ex.muscleGroups.split(",").map((mg) => mg.trim()).filter(Boolean).map((mg) => (
                          <span key={mg} className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(mg)}`}>
                            {mg}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
                        {ex.equipment.split(",").map((eq) => eq.trim()).filter(Boolean).map((eq) => (
                          <span key={eq} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 capitalize">{ex.type.replace("_", " ")}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div ref={bottomRef} />

      {/* Muscle Group Picker Modal */}
      {showMusclePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMusclePicker(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Muscle Groups</h3>
              <button onClick={() => setShowMusclePicker(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Equipment</h3>
              <button onClick={() => setShowEquipmentPicker(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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
