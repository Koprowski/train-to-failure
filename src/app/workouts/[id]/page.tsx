"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
}

interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  setType: string;
  weightLbs: number | null;
  reps: number | null;
  timeSecs: number | null;
  rpe: number | null;
  completed: boolean;
  notes: string | null;
  exercise: Exercise;
}

interface Workout {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  duration: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export default function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workouts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkout(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Workout not found</p>
        <Link href="/workouts" className="text-emerald-500 hover:underline mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    );
  }

  // Group sets by exercise
  const exerciseGroups: { exercise: Exercise; sets: WorkoutSet[] }[] = [];
  const groupMap = new Map<string, { exercise: Exercise; sets: WorkoutSet[] }>();
  for (const set of workout.sets) {
    if (!groupMap.has(set.exerciseId)) {
      groupMap.set(set.exerciseId, { exercise: set.exercise, sets: [] });
    }
    groupMap.get(set.exerciseId)!.sets.push(set);
  }
  exerciseGroups.push(...groupMap.values());

  const totalVolume = workout.sets.reduce((sum, s) => {
    if (s.weightLbs && s.reps && s.completed) return sum + s.weightLbs * s.reps;
    return sum;
  }, 0);

  const completedSets = workout.sets.filter((s) => s.completed).length;

  const setTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      warmup: "W",
      working: "",
      dropset: "D",
      failure: "F",
    };
    return labels[type] ?? "";
  };

  const setTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      warmup: "text-yellow-500",
      dropset: "text-blue-500",
      failure: "text-red-500",
    };
    return colors[type] ?? "";
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/workouts" className="hover:text-white transition-colors">Workouts</Link>
        <span>/</span>
        <span className="text-white">{workout.name}</span>
      </div>

      {/* Summary */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-2xl font-bold">{workout.name}</h1>
        <p className="text-gray-400 mt-1">{formatDate(workout.startedAt)} at {formatTime(workout.startedAt)}</p>

        <div className="grid grid-cols-3 gap-4 mt-5">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Duration</p>
            <p className="text-xl font-semibold mt-0.5">{formatDuration(workout.duration)}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Volume</p>
            <p className="text-xl font-semibold mt-0.5">{totalVolume.toLocaleString()} <span className="text-sm text-gray-400">lbs</span></p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Sets</p>
            <p className="text-xl font-semibold mt-0.5">{completedSets} <span className="text-sm text-gray-400">/ {workout.sets.length}</span></p>
          </div>
        </div>

        {workout.notes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-sm text-gray-400">{workout.notes}</p>
          </div>
        )}
      </div>

      {/* Exercise details */}
      {exerciseGroups.map(({ exercise, sets }) => (
        <div key={exercise.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/50">
            <Link href={`/exercises/${exercise.id}`} className="font-semibold text-white hover:text-emerald-500 transition-colors">
              {exercise.name}
            </Link>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{exercise.muscleGroups}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-800">
                  <th className="py-2 px-4 text-left">Set</th>
                  <th className="py-2 px-3 text-right">Weight</th>
                  <th className="py-2 px-3 text-right">Reps</th>
                  <th className="py-2 px-3 text-right">RPE</th>
                  <th className="py-2 px-3 text-center">Done</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set) => (
                  <tr key={set.id} className={`border-b border-gray-800/50 ${set.completed ? "" : "opacity-50"}`}>
                    <td className="py-2 px-4">
                      <span className="text-gray-300">{set.setNumber}</span>
                      {setTypeLabel(set.setType) && (
                        <span className={`ml-1.5 text-xs font-medium ${setTypeColor(set.setType)}`}>
                          {setTypeLabel(set.setType)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      {set.weightLbs != null ? `${set.weightLbs} lbs` : "--"}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      {set.reps ?? (set.timeSecs ? `${set.timeSecs}s` : "--")}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400">
                      {set.rpe ?? "--"}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {set.completed ? (
                        <span className="text-emerald-500">
                          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-600">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {exerciseGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No exercises logged in this workout</p>
        </div>
      )}
    </div>
  );
}
