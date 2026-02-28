"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  equipment: string;
  type: string;
  imageUrl: string | null;
}

interface RecentWorkout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  sets: { exerciseId: string; exercise: { name: string } }[];
}

interface TemplateData {
  id: string;
  name: string;
  folder: string | null;
  exercises: { exercise: { name: string }; sets: number }[];
}

interface SetData {
  tempId: string;
  dbId?: string;
  exerciseId: string;
  setNumber: number;
  setType: "warmup" | "working" | "dropset" | "failure";
  weightLbs: string;
  reps: string;
  timeSecs: string;
  rpe: string;
  completed: boolean;
  notes: string;
  previousWeight?: string;
  previousReps?: string;
  workoutExerciseId?: string;
}

interface ExerciseBlock {
  exercise: Exercise;
  sets: SetData[];
  workoutExerciseId?: string;
  startedAt?: Date;
  elapsed: number;
  paused: boolean;
  finished: boolean;
}

let tempIdCounter = 0;
function nextTempId() {
  return `temp_${++tempIdCounter}`;
}

function WorkoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const templateId = searchParams.get("templateId");
  const duplicateFrom = searchParams.get("duplicateFrom");
  const quickExerciseId = searchParams.get("quickExercise");

  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [exerciseBlocks, setExerciseBlocks] = useState<ExerciseBlock[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [muscleTab, setMuscleTab] = useState("recent");
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exerciseTimerRefs = useRef<Map<number, { startedAt: Date; accumulated: number }>>(new Map());
  const quickExerciseLoaded = useRef(false);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [launcherLoading, setLauncherLoading] = useState(true);
  const [jsonMuscleGroups, setJsonMuscleGroups] = useState<string[]>([]);

  // Load launcher data (recent workouts + templates) when no query params
  useEffect(() => {
    if (resumeId || templateId || duplicateFrom || quickExerciseId) {
      setLauncherLoading(false);
      return;
    }

    Promise.all([
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([workouts, tmpl]) => {
      const finished = (Array.isArray(workouts) ? workouts : [])
        .filter((w: RecentWorkout) => w.finishedAt)
        .slice(0, 10);
      setRecentWorkouts(finished);
      setTemplates(Array.isArray(tmpl) ? tmpl : []);
      setLauncherLoading(false);
    }).catch(() => setLauncherLoading(false));
  }, [resumeId, templateId, duplicateFrom, quickExerciseId]);

  // Load exercises for picker
  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => setAllExercises(Array.isArray(data) ? data : []))
      .catch(() => {});

    // Also load muscle groups from exercises.json to ensure complete list
    fetch("/gifs/exercises.json")
      .then((r) => r.json())
      .then((data: Record<string, { muscleGroups?: string }>) => {
        const groups = new Set<string>();
        for (const info of Object.values(data)) {
          (info.muscleGroups || "").split(",").forEach((g: string) => {
            const trimmed = g.trim().toLowerCase();
            if (trimmed) groups.add(trimmed);
          });
        }
        setJsonMuscleGroups(Array.from(groups).sort());
      })
      .catch(() => {});
  }, []);

  // Resume existing workout
  useEffect(() => {
    if (resumeId) {
      fetch(`/api/workouts/${resumeId}`)
        .then((r) => r.json())
        .then((workout) => {
          if (workout && workout.id) {
            setWorkoutId(workout.id);
            setWorkoutName(workout.name);
            startTimeRef.current = new Date(workout.startedAt);
            setStarted(true);

            // Rebuild exercise blocks from sets (if any exist already)
            if (workout.sets && workout.sets.length > 0) {
              const blockMap = new Map<string, ExerciseBlock>();
              for (const s of workout.sets) {
                if (!blockMap.has(s.exerciseId)) {
                  blockMap.set(s.exerciseId, {
                    exercise: s.exercise,
                    sets: [],
                    elapsed: 0,
                    paused: true,
                    finished: false,
                  });
                }
                blockMap.get(s.exerciseId)!.sets.push({
                  tempId: nextTempId(),
                  dbId: s.id,
                  exerciseId: s.exerciseId,
                  setNumber: s.setNumber,
                  setType: s.setType,
                  weightLbs: s.weightLbs?.toString() ?? "",
                  reps: s.reps?.toString() ?? "",
                  timeSecs: s.timeSecs?.toString() ?? "",
                  rpe: s.rpe?.toString() ?? "",
                  completed: s.completed,
                  notes: s.notes ?? "",
                  workoutExerciseId: s.workoutExerciseId ?? undefined,
                });
              }
              setExerciseBlocks(Array.from(blockMap.values()));
            }
          }
        })
        .catch(() => {});
    }
  }, [resumeId]);

  // Quick exercise: load previous sets and auto-add exercise block
  useEffect(() => {
    if (!quickExerciseId || !workoutId || quickExerciseLoaded.current) return;
    if (exerciseBlocks.length > 0) return; // already has blocks from resume

    quickExerciseLoaded.current = true;

    // Fetch recent sets for this exercise and the exercise details
    Promise.all([
      fetch(`/api/exercises/recent?days=30`).then((r) => r.json()),
      fetch(`/api/exercises`).then((r) => r.json()),
    ]).then(async ([recentData, allEx]) => {
      const exercises = Array.isArray(allEx) ? allEx : [];
      const exercise = exercises.find((e: Exercise) => e.id === quickExerciseId);
      if (!exercise) return;

      // Create WorkoutExercise record
      const weRes = await fetch(`/api/workouts/${workoutId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: quickExerciseId }),
      });
      const workoutExercise = await weRes.json();

      // Find previous sets for this exercise
      const recent = Array.isArray(recentData)
        ? recentData.find((r: { exercise: Exercise }) => r.exercise.id === quickExerciseId)
        : null;

      let sets: SetData[];
      if (recent && recent.lastSets && recent.lastSets.length > 0) {
        sets = recent.lastSets.map((s: { setNumber: number; setType: string; weightLbs: number | null; reps: number | null; timeSecs: number | null; rpe: number | null }) => ({
          tempId: nextTempId(),
          exerciseId: quickExerciseId,
          setNumber: s.setNumber,
          setType: s.setType as SetData["setType"],
          weightLbs: "",
          reps: "",
          timeSecs: "",
          rpe: "",
          completed: false,
          notes: "",
          previousWeight: s.weightLbs?.toString() ?? "",
          previousReps: s.reps?.toString() ?? "",
          workoutExerciseId: workoutExercise.id,
        }));
      } else {
        sets = [{
          tempId: nextTempId(),
          exerciseId: quickExerciseId,
          setNumber: 1,
          setType: "working",
          weightLbs: "",
          reps: "",
          timeSecs: "",
          rpe: "",
          completed: false,
          notes: "",
          workoutExerciseId: workoutExercise.id,
        }];
      }

      const block: ExerciseBlock = {
        exercise,
        sets,
        workoutExerciseId: workoutExercise.id,
        startedAt: new Date(),
        elapsed: 0,
        paused: false,
        finished: false,
      };

      setExerciseBlocks([block]);
      setActiveExerciseIndex(0);
      exerciseTimerRefs.current.set(0, { startedAt: new Date(), accumulated: 0 });
    }).catch((err) => console.error("Failed to load quick exercise:", err));
  }, [quickExerciseId, workoutId, exerciseBlocks.length]);

  // Load template exercises
  useEffect(() => {
    if (templateId && !resumeId) {
      fetch(`/api/templates/${templateId}`)
        .then((r) => r.json())
        .then((template) => {
          if (template && template.name) {
            setWorkoutName(template.name);
            const blocks: ExerciseBlock[] = (template.exercises || []).map(
              (te: { exercise: Exercise; sets: number; exerciseId: string }) => {
                const sets: SetData[] = [];
                for (let i = 0; i < (te.sets || 3); i++) {
                  sets.push({
                    tempId: nextTempId(),
                    exerciseId: te.exerciseId,
                    setNumber: i + 1,
                    setType: "working",
                    weightLbs: "",
                    reps: "",
                    timeSecs: "",
                    rpe: "",
                    completed: false,
                    notes: "",
                  });
                }
                return { exercise: te.exercise, sets, elapsed: 0, paused: true, finished: false };
              }
            );
            setExerciseBlocks(blocks);
          }
        })
        .catch(() => {});
    }
  }, [templateId, resumeId]);

  // Duplicate from previous workout
  useEffect(() => {
    if (duplicateFrom && !resumeId && !templateId) {
      fetch(`/api/workouts/${duplicateFrom}`)
        .then((r) => r.json())
        .then((workout) => {
          if (workout && workout.id) {
            setWorkoutName(workout.name);
            const blockMap = new Map<string, ExerciseBlock>();
            for (const s of workout.sets || []) {
              if (!blockMap.has(s.exerciseId)) {
                blockMap.set(s.exerciseId, {
                  exercise: s.exercise,
                  sets: [],
                  elapsed: 0,
                  paused: true,
                  finished: false,
                });
              }
              const prevWeight = s.weightLbs?.toString() ?? "";
              const prevReps = s.reps?.toString() ?? "";
              blockMap.get(s.exerciseId)!.sets.push({
                tempId: nextTempId(),
                exerciseId: s.exerciseId,
                setNumber: s.setNumber,
                setType: s.setType,
                weightLbs: "",
                reps: "",
                timeSecs: "",
                rpe: "",
                completed: false,
                notes: "",
                previousWeight: prevWeight,
                previousReps: prevReps,
              });
            }
            setExerciseBlocks(Array.from(blockMap.values()));
          }
        })
        .catch(() => {});
    }
  }, [duplicateFrom, resumeId, templateId]);

  // Exercise timers - tick every second
  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      setExerciseBlocks((prev) => {
        let changed = false;
        const updated = prev.map((block, idx) => {
          if (idx === activeExerciseIndex && !block.paused && !block.finished) {
            const ref = exerciseTimerRefs.current.get(idx);
            if (ref) {
              const newElapsed = ref.accumulated + Math.floor((Date.now() - ref.startedAt.getTime()) / 1000);
              if (newElapsed !== block.elapsed) {
                changed = true;
                return { ...block, elapsed: newElapsed };
              }
            }
          }
          return block;
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [started, activeExerciseIndex]);

  // Compute total workout elapsed from all exercise blocks
  const totalElapsed = exerciseBlocks.reduce((sum, b) => sum + b.elapsed, 0);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startWorkout = async () => {
    if (!workoutName.trim()) return;
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workoutName,
          templateId: templateId || undefined,
          ...(customDate ? { startedAt: new Date(customDate).toISOString() } : {}),
        }),
      });
      const data = await res.json();
      if (data.id) {
        setWorkoutId(data.id);
        startTimeRef.current = new Date(data.startedAt);
        setStarted(true);
      }
    } catch (err) {
      console.error("Failed to start workout:", err);
    }
  };

  const startExerciseTimer = (blockIndex: number) => {
    // Pause current active exercise if different
    if (activeExerciseIndex !== null && activeExerciseIndex !== blockIndex) {
      pauseExerciseTimer(activeExerciseIndex);
    }

    setActiveExerciseIndex(blockIndex);
    const ref = exerciseTimerRefs.current.get(blockIndex);
    const accumulated = ref ? ref.accumulated : exerciseBlocks[blockIndex].elapsed;
    exerciseTimerRefs.current.set(blockIndex, { startedAt: new Date(), accumulated });

    setExerciseBlocks((prev) => {
      const updated = [...prev];
      updated[blockIndex] = { ...updated[blockIndex], paused: false, startedAt: new Date() };
      return updated;
    });
  };

  const pauseExerciseTimer = (blockIndex: number) => {
    const ref = exerciseTimerRefs.current.get(blockIndex);
    if (ref) {
      const elapsed = ref.accumulated + Math.floor((Date.now() - ref.startedAt.getTime()) / 1000);
      exerciseTimerRefs.current.set(blockIndex, { startedAt: new Date(), accumulated: elapsed });

      setExerciseBlocks((prev) => {
        const updated = [...prev];
        updated[blockIndex] = { ...updated[blockIndex], paused: true, elapsed };
        return updated;
      });
    }

    if (activeExerciseIndex === blockIndex) {
      setActiveExerciseIndex(null);
    }
  };

  const finishExerciseTimer = async (blockIndex: number) => {
    pauseExerciseTimer(blockIndex);
    const block = exerciseBlocks[blockIndex];

    setExerciseBlocks((prev) => {
      const updated = [...prev];
      updated[blockIndex] = { ...updated[blockIndex], finished: true, paused: true };
      return updated;
    });

    // Update WorkoutExercise on server
    if (workoutId && block.workoutExerciseId) {
      try {
        await fetch(`/api/workouts/${workoutId}/exercises/${block.workoutExerciseId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finishedAt: new Date().toISOString(),
            duration: block.elapsed,
          }),
        });
      } catch (err) {
        console.error("Failed to finish exercise:", err);
      }
    }
  };

  const addExercise = async (exercise: Exercise) => {
    let workoutExerciseId: string | undefined;

    // Create WorkoutExercise record if workout exists
    if (workoutId) {
      try {
        const res = await fetch(`/api/workouts/${workoutId}/exercises`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: exercise.id }),
        });
        const we = await res.json();
        workoutExerciseId = we.id;
      } catch (err) {
        console.error("Failed to create workout exercise:", err);
      }
    }

    const defaultSets: SetData[] = [
      {
        tempId: nextTempId(),
        exerciseId: exercise.id,
        setNumber: 1,
        setType: "working",
        weightLbs: "",
        reps: "",
        timeSecs: "",
        rpe: "",
        completed: false,
        notes: "",
        workoutExerciseId,
      },
    ];
    const newBlock: ExerciseBlock = {
      exercise,
      sets: defaultSets,
      workoutExerciseId,
      elapsed: 0,
      paused: true,
      finished: false,
    };

    setExerciseBlocks((prev) => [...prev, newBlock]);
    setShowExercisePicker(false);
    setExerciseSearch("");

    // Auto-start timer for the new exercise
    const newIndex = exerciseBlocks.length;
    setTimeout(() => startExerciseTimer(newIndex), 0);
  };

  const addSet = (blockIndex: number) => {
    setExerciseBlocks((prev) => {
      const updated = [...prev];
      const block = { ...updated[blockIndex], sets: [...updated[blockIndex].sets] };
      const lastSet = block.sets[block.sets.length - 1];
      block.sets.push({
        tempId: nextTempId(),
        exerciseId: block.exercise.id,
        setNumber: block.sets.length + 1,
        setType: "working",
        weightLbs: lastSet?.weightLbs ?? "",
        reps: lastSet?.reps ?? "",
        timeSecs: lastSet?.timeSecs ?? "",
        rpe: "",
        completed: false,
        notes: "",
        workoutExerciseId: block.workoutExerciseId,
      });
      updated[blockIndex] = block;
      return updated;
    });
  };

  const removeSet = (blockIndex: number, setIndex: number) => {
    setExerciseBlocks((prev) => {
      const updated = [...prev];
      const block = { ...updated[blockIndex], sets: [...updated[blockIndex].sets] };
      block.sets.splice(setIndex, 1);
      block.sets.forEach((s, i) => (s.setNumber = i + 1));
      if (block.sets.length === 0) {
        updated.splice(blockIndex, 1);
      } else {
        updated[blockIndex] = block;
      }
      return updated;
    });
  };

  const updateSet = (blockIndex: number, setIndex: number, field: keyof SetData, value: string | boolean) => {
    setExerciseBlocks((prev) => {
      const updated = [...prev];
      const block = { ...updated[blockIndex], sets: [...updated[blockIndex].sets] };
      block.sets[setIndex] = { ...block.sets[setIndex], [field]: value };
      updated[blockIndex] = block;
      return updated;
    });
  };

  const completeSet = useCallback(async (blockIndex: number, setIndex: number) => {
    if (!workoutId) return;
    const block = exerciseBlocks[blockIndex];
    const set = block.sets[setIndex];
    const newCompleted = !set.completed;

    let effectiveWeight = set.weightLbs;
    let effectiveReps = set.reps;
    if (newCompleted) {
      if (!effectiveWeight && set.previousWeight) {
        effectiveWeight = set.previousWeight;
        updateSet(blockIndex, setIndex, "weightLbs", effectiveWeight);
      }
      if (!effectiveReps && set.previousReps) {
        effectiveReps = set.previousReps;
        updateSet(blockIndex, setIndex, "reps", effectiveReps);
      }
    }

    updateSet(blockIndex, setIndex, "completed", newCompleted);

    const payload: Record<string, unknown> = {
      exerciseId: set.exerciseId,
      setNumber: set.setNumber,
      setType: set.setType,
      weightLbs: effectiveWeight ? parseFloat(effectiveWeight) : null,
      reps: effectiveReps ? parseInt(effectiveReps) : null,
      timeSecs: set.timeSecs ? parseInt(set.timeSecs) : null,
      rpe: set.rpe ? parseFloat(set.rpe) : null,
      completed: newCompleted,
      notes: set.notes || null,
      workoutExerciseId: set.workoutExerciseId || block.workoutExerciseId || null,
    };

    try {
      if (set.dbId) {
        await fetch(`/api/workouts/${workoutId}/sets/${set.dbId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`/api/workouts/${workoutId}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.id) {
          setExerciseBlocks((prev) => {
            const u = [...prev];
            const b = { ...u[blockIndex], sets: [...u[blockIndex].sets] };
            b.sets[setIndex] = { ...b.sets[setIndex], dbId: data.id, completed: newCompleted };
            u[blockIndex] = b;
            return u;
          });
        }
      }
    } catch (err) {
      console.error("Failed to save set:", err);
    }
  }, [workoutId, exerciseBlocks]);

  const discardWorkout = async () => {
    if (!workoutId) {
      router.push("/");
      return;
    }
    if (!confirm("Discard this workout? All logged sets will be deleted.")) return;
    try {
      await fetch(`/api/workouts/${workoutId}`, { method: "DELETE" });
    } catch {
      // Best effort
    }
    router.push("/");
  };

  const finishWorkout = async () => {
    if (!workoutId) return;
    setSaving(true);

    try {
      // Finish any active exercise timers
      for (let i = 0; i < exerciseBlocks.length; i++) {
        if (!exerciseBlocks[i].finished) {
          await finishExerciseTimer(i);
        }
      }

      // Save any unsaved sets
      for (const block of exerciseBlocks) {
        for (const set of block.sets) {
          if (!set.dbId && (set.weightLbs || set.reps || set.timeSecs)) {
            const payload: Record<string, unknown> = {
              exerciseId: set.exerciseId,
              setNumber: set.setNumber,
              setType: set.setType,
              weightLbs: set.weightLbs ? parseFloat(set.weightLbs) : null,
              reps: set.reps ? parseInt(set.reps) : null,
              timeSecs: set.timeSecs ? parseInt(set.timeSecs) : null,
              rpe: set.rpe ? parseFloat(set.rpe) : null,
              completed: set.completed,
              notes: set.notes || null,
              workoutExerciseId: set.workoutExerciseId || block.workoutExerciseId || null,
            };
            await fetch(`/api/workouts/${workoutId}/sets`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
        }
      }

      // Finish the workout with total duration
      const totalDuration = exerciseBlocks.reduce((sum, b) => sum + b.elapsed, 0);
      await fetch(`/api/workouts/${workoutId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedAt: new Date().toISOString(),
          duration: totalDuration,
          name: workoutName,
        }),
      });

      router.push(`/workouts/${workoutId}`);
    } catch (err) {
      console.error("Failed to finish workout:", err);
      setSaving(false);
    }
  };

  // Build muscle group tabs from both DB exercises and exercises.json
  const muscleGroups = (() => {
    const groups = new Set<string>(jsonMuscleGroups);
    allExercises.forEach((ex) => {
      ex.muscleGroups.split(",").forEach((g) => {
        const trimmed = g.trim().toLowerCase();
        if (trimmed) groups.add(trimmed);
      });
    });
    return Array.from(groups).sort();
  })();

  // Get recently used exercise IDs from current workout blocks
  const recentExerciseIds = new Set(
    exerciseBlocks.map((b) => b.exercise.id)
  );

  const filteredExercises = allExercises.filter((ex) => {
    if (exerciseSearch && !ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())) return false;
    if (muscleTab === "all" || exerciseSearch) return true;
    if (muscleTab === "recent") return recentExerciseIds.has(ex.id);
    const exGroups = ex.muscleGroups.split(",").map((g) => g.trim().toLowerCase());
    return exGroups.includes(muscleTab);
  });

  const formatLauncherDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getUniqueExercises = (sets: RecentWorkout["sets"]) => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const s of sets) {
      if (!seen.has(s.exerciseId)) {
        seen.add(s.exerciseId);
        names.push(s.exercise.name);
      }
    }
    return names;
  };

  // Pre-start state (skip if quick exercise -- already started)
  if (!started && !quickExerciseId) {
    const showLauncher = !resumeId && !templateId && !duplicateFrom;

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Workout</h1>

        {/* Start blank */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md">
          <label className="block text-sm font-medium text-gray-300 mb-2">Workout Name</label>
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            placeholder="e.g., Push Day, Upper Body"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
            onKeyDown={(e) => { if (e.key === "Enter") startWorkout(); }}
          />
          <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time <span className="text-gray-500 font-normal">(optional, defaults to now)</span></label>
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 [color-scheme:dark]"
          />
          <button
            onClick={startWorkout}
            disabled={!workoutName.trim()}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Workout
          </button>
        </div>

        {showLauncher && !launcherLoading && (
          <>
            {/* Recent workouts */}
            {recentWorkouts.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Recent Workouts</h2>
                <div className="space-y-2">
                  {recentWorkouts.map((w) => {
                    const exercises = getUniqueExercises(w.sets);
                    return (
                      <button
                        key={w.id}
                        onClick={() => router.push(`/workouts/new?duplicateFrom=${w.id}`)}
                        className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{w.name}</span>
                          <span className="text-xs text-gray-500">{formatLauncherDate(w.startedAt)}</span>
                        </div>
                        {exercises.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {exercises.join(", ")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saved templates */}
            {templates.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">Saved Templates</h2>
                <div className="space-y-2">
                  {templates.map((t) => {
                    const totalSets = t.exercises.reduce((sum, e) => sum + e.sets, 0);
                    return (
                      <button
                        key={t.id}
                        onClick={() => router.push(`/workouts/new?templateId=${t.id}`)}
                        className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{t.name}</span>
                          <span className="text-xs text-gray-500">
                            {t.exercises.length} exercise{t.exercises.length !== 1 ? "s" : ""} &middot; {totalSets} sets
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {t.exercises.map((e) => e.exercise.name).join(", ")}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <Link
                  href="/templates"
                  className="inline-block text-sm text-emerald-500 hover:text-emerald-400 mt-3 transition-colors"
                >
                  Manage Templates &rarr;
                </Link>
              </div>
            )}
          </>
        )}

        {showLauncher && launcherLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
          </div>
        )}
      </div>
    );
  }

  // Loading state for quick exercise
  if (quickExerciseId && exerciseBlocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header with timer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="text-2xl font-bold bg-transparent border-none outline-none w-full text-white"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-mono text-emerald-500 tabular-nums">
            {formatTimer(totalElapsed)}
          </div>
          <button
            onClick={discardWorkout}
            disabled={saving}
            className="text-gray-400 hover:text-red-400 transition-colors p-2"
            title="Discard workout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={finishWorkout}
            disabled={saving}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Finish"}
          </button>
        </div>
      </div>

      {/* Exercise blocks */}
      {exerciseBlocks.map((block, blockIndex) => {
        const isActive = activeExerciseIndex === blockIndex && !block.paused && !block.finished;

        return (
          <div
            key={`${block.exercise.id}-${blockIndex}`}
            className={`bg-gray-900 border rounded-xl overflow-hidden ${
              isActive ? "border-emerald-500/50" : "border-gray-800"
            }`}
          >
            <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="font-semibold text-white">{block.exercise.name}</h3>
                  <p className="text-xs text-gray-400 capitalize">{block.exercise.muscleGroups}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Exercise timer */}
                <span className={`text-sm font-mono tabular-nums ${isActive ? "text-emerald-400" : "text-gray-500"}`}>
                  {formatTimer(block.elapsed)}
                </span>

                {/* Timer controls */}
                {!block.finished ? (
                  <>
                    {block.paused ? (
                      <button
                        onClick={() => startExerciseTimer(blockIndex)}
                        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-emerald-500"
                        title="Start exercise"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => pauseExerciseTimer(blockIndex)}
                        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-yellow-500"
                        title="Pause exercise"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => finishExerciseTimer(blockIndex)}
                      className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                      title="Finish exercise"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">Done</span>
                )}

                <button
                  onClick={() => {
                    setExerciseBlocks((prev) => prev.filter((_, i) => i !== blockIndex));
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Remove exercise"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Set table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-800">
                    <th className="py-2 px-3 text-left w-10">Set</th>
                    <th className="py-2 px-2 text-left w-24">Type</th>
                    <th className="py-2 px-2 text-right w-20">Weight</th>
                    <th className="py-2 px-2 text-right w-16">Reps</th>
                    {(block.exercise.type === "time" || block.exercise.type === "cardio") && (
                      <th className="py-2 px-2 text-right w-16">Time</th>
                    )}
                    <th className="py-2 px-2 text-right w-14">
                      <span className="group relative inline-flex items-center gap-1 cursor-help">
                        RPE
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-48 px-3 py-2 text-xs text-left font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                          Rate of Perceived Exertion (1-10). How hard the set felt, where 10 is max effort.
                        </span>
                      </span>
                    </th>
                    <th className="py-2 px-2 text-center w-10"></th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {block.sets.map((set, setIndex) => (
                    <tr
                      key={set.tempId}
                      className={`border-b border-gray-800/50 ${set.completed ? "bg-emerald-500/5" : ""}`}
                    >
                      <td className="py-1.5 px-3 text-gray-400 font-medium">{set.setNumber}</td>
                      <td className="py-1.5 px-2">
                        <select
                          value={set.setType}
                          onChange={(e) => updateSet(blockIndex, setIndex, "setType", e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="warmup">Warmup</option>
                          <option value="working">Working</option>
                          <option value="dropset">Dropset</option>
                          <option value="failure">Failure</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={set.weightLbs}
                          onChange={(e) => updateSet(blockIndex, setIndex, "weightLbs", e.target.value)}
                          placeholder={set.previousWeight || "lbs"}
                          className={`w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            set.weightLbs ? "text-white" : set.previousWeight ? "placeholder-gray-500 italic" : "placeholder-gray-600"
                          }`}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e) => updateSet(blockIndex, setIndex, "reps", e.target.value)}
                          placeholder={set.previousReps || "reps"}
                          className={`w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            set.reps ? "text-white" : set.previousReps ? "placeholder-gray-500 italic" : "placeholder-gray-600"
                          }`}
                        />
                      </td>
                      {(block.exercise.type === "time" || block.exercise.type === "cardio") && (
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.timeSecs}
                            onChange={(e) => updateSet(blockIndex, setIndex, "timeSecs", e.target.value)}
                            placeholder="sec"
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-600"
                          />
                        </td>
                      )}
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="1"
                          max="10"
                          value={set.rpe}
                          onChange={(e) => updateSet(blockIndex, setIndex, "rpe", e.target.value)}
                          placeholder="RPE"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-600"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => completeSet(blockIndex, setIndex)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                            set.completed
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-600 text-transparent hover:border-gray-500"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => removeSet(blockIndex, setIndex)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2">
              <button
                onClick={() => addSet(blockIndex)}
                className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Set
              </button>
            </div>
          </div>
        );
      })}

      {/* Add Exercise button */}
      <button
        onClick={() => setShowExercisePicker(true)}
        className="w-full border-2 border-dashed border-gray-700 rounded-xl py-4 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Exercise
      </button>

      {/* Exercise picker modal */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60" onClick={() => { setShowExercisePicker(false); setExerciseSearch(""); }}>
          <div
            className="bg-gray-900 border border-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Select Exercise</h2>
                <button onClick={() => { setShowExercisePicker(false); setExerciseSearch(""); }} className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search exercises..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* Muscle group tabs */}
            <div className="px-4 py-2 border-b border-gray-800 overflow-x-auto">
              <div className="flex gap-1.5 min-w-max">
                {["recent", "all", ...muscleGroups].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMuscleTab(tab)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      muscleTab === tab
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredExercises.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No exercises found</p>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExercise(ex)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-3"
                  >
                    {ex.imageUrl ? (
                      <img src={ex.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-700 shrink-0 flex items-center justify-center text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">{ex.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{ex.muscleGroups}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed bottom bar on mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-gray-900 border-t border-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={discardWorkout}
            disabled={saving}
            className="text-gray-400 hover:text-red-400 transition-colors text-sm"
          >
            Discard
          </button>
          <span className="text-sm text-gray-600">|</span>
          <span className="text-sm text-gray-400">
            {exerciseBlocks.length} exercise{exerciseBlocks.length !== 1 ? "s" : ""} &middot;{" "}
            {exerciseBlocks.reduce((sum, b) => sum + b.sets.filter((s) => s.completed).length, 0)} sets done
          </span>
        </div>
        <button
          onClick={finishWorkout}
          disabled={saving}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? "Saving..." : "Finish Workout"}
        </button>
      </div>
    </div>
  );
}

export default function NewWorkoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    }>
      <WorkoutContent />
    </Suspense>
  );
}
