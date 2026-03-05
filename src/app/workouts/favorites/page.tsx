"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface FavoriteExercise {
  id: string;
  name: string;
  muscleGroups: string;
}

interface FavoriteWorkout {
  id: string;
  name: string;
  createdAt: string;
  exercises: FavoriteExercise[];
}

export default function FavoriteWorkoutsPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workouts/favorites")
      .then((r) => r.json())
      .then((data) => {
        setFavorites(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startFavorite = async (name: string) => {
    try {
      const res = await fetch("/api/workouts");
      const workouts = await res.json();
      const match = (Array.isArray(workouts) ? workouts : []).find(
        (w: { name: string; finishedAt: string | null }) => w.name === name && w.finishedAt
      );
      if (match) {
        router.push(`/workouts/new?duplicateFrom=${match.id}`);
      }
    } catch {
      // ignore
    }
  };

  const removeFavorite = async (id: string, name: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    try {
      // Find any workout with this name to get the toggle endpoint
      const res = await fetch("/api/workouts");
      const workouts = await res.json();
      const match = (Array.isArray(workouts) ? workouts : []).find(
        (w: { name: string }) => w.name === name
      );
      if (match) {
        await fetch(`/api/workouts/${match.id}/favorite`, { method: "POST" });
      }
    } catch {
      // Reload on error
      const data = await fetch("/api/workouts/favorites").then((r) => r.json());
      setFavorites(Array.isArray(data) ? data : []);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Favorite Workouts</h1>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <p className="text-lg">No favorite workouts yet</p>
          <p className="text-sm mt-1">Tap the heart icon on a workout to save it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{fav.name}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {fav.exercises.length} exercise{fav.exercises.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => startFavorite(fav.name)}
                    className="p-1.5 rounded text-gray-500 hover:text-emerald-400 transition-colors"
                    title="Start this workout"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeFavorite(fav.id, fav.name)}
                    className="p-1.5 rounded transition-colors"
                    title="Remove from favorites"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {fav.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300">{ex.name}</span>
                    <span className="text-gray-600 text-xs capitalize">{ex.muscleGroups}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
