"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
  imageUrl: string | null;
}

interface SetEntry {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  workout: { id: string; name: string } | null;
  setNumber: number;
  setType: string;
  weightLbs: number | null;
  reps: number | null;
  timeSecs: number | null;
  rpe: number | null;
  notes: string | null;
  completed: boolean;
  createdAt: string;
}

interface QuickLogForm {
  exerciseId: string;
  setType: string;
  weightLbs: string;
  reps: string;
  timeSecs: string;
  rpe: string;
  notes: string;
}

export default function ActivityLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>}>
      <ActivityLogContent />
    </Suspense>
  );
}

function ActivityLogContent() {
  const searchParams = useSearchParams();
  const logExerciseId = searchParams.get("log");

  const [sets, setSets] = useState<SetEntry[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialLogHandled, setInitialLogHandled] = useState(false);
  const [form, setForm] = useState<QuickLogForm>({
    exerciseId: "",
    setType: "working",
    weightLbs: "",
    reps: "",
    timeSecs: "",
    rpe: "",
    notes: "",
  });

  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchMoved, setTouchMoved] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingSet, setEditingSet] = useState<SetEntry | null>(null);
  const [editForm, setEditForm] = useState({ weightLbs: "", reps: "", rpe: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setSwipeId(id);
    setSwipeX(0);
    setTouchMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || !swipeId) return;
    const dx = e.touches[0].clientX - touchStart.x;
    const dy = e.touches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      setTouchMoved(true);
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setSwipeX(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!swipeId) return;
    const threshold = 80;
    if (swipeX < -threshold) {
      handleDeleteSet(swipeId);
    } else if (swipeX > threshold) {
      const set = sets.find((s) => s.id === swipeId);
      if (set) openEditModal(set);
    }
    setSwipeId(null);
    setSwipeX(0);
    setTouchStart(null);
    setTouchMoved(false);
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm("Delete this set?")) { setSwipeId(null); setSwipeX(0); return; }
    setDeleting(id);
    try {
      const res = await fetch(`/api/activity-log/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSets((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const openEditModal = (set: SetEntry) => {
    setEditingSet(set);
    setEditForm({
      weightLbs: set.weightLbs?.toString() ?? "",
      reps: set.reps?.toString() ?? "",
      rpe: set.rpe?.toString() ?? "",
      notes: set.notes ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editingSet) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.weightLbs) body.weightLbs = parseFloat(editForm.weightLbs);
      if (editForm.reps) body.reps = parseInt(editForm.reps);
      if (editForm.rpe) body.rpe = parseFloat(editForm.rpe);
      body.notes = editForm.notes || null;

      const res = await fetch(`/api/activity-log/${editingSet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingSet(null);
        fetchSets();
      }
    } finally {
      setEditSaving(false);
    }
  };

  const fetchSets = useCallback(() => {
    const params = new URLSearchParams();
    if (exerciseFilter) params.set("exerciseId", exerciseFilter);
    fetch(`/api/activity-log?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [exerciseFilter]);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => setExercises(Array.isArray(data) ? data : []));
  }, []);

  // Auto-open quick log modal if ?log=exerciseId is present
  useEffect(() => {
    if (logExerciseId && exercises.length > 0 && !initialLogHandled) {
      setForm((f) => ({ ...f, exerciseId: logExerciseId }));
      setShowQuickLog(true);
      setInitialLogHandled(true);
    }
  }, [logExerciseId, exercises, initialLogHandled]);

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.exerciseId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ exerciseId: "", setType: "working", weightLbs: "", reps: "", timeSecs: "", rpe: "", notes: "" });
        setShowQuickLog(false);
        setExerciseSearch("");
        fetchSets();
      }
    } finally {
      setSaving(false);
    }
  };

  // Group sets by date
  const groupedByDate = sets.reduce<Record<string, SetEntry[]>>((acc, set) => {
    const date = new Date(set.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(set);
    return acc;
  }, {});

  const filteredExercises = exercises.filter(
    (ex) => !exerciseSearch || ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const selectedExercise = exercises.find((ex) => ex.id === form.exerciseId);

  const setTypeLabel: Record<string, string> = {
    warmup: "W",
    working: "",
    dropset: "D",
    failure: "F",
  };

  const setTypeColor: Record<string, string> = {
    warmup: "text-yellow-500",
    dropset: "text-blue-400",
    failure: "text-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <button
          onClick={() => setShowQuickLog(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Quick Log
        </button>
      </div>

      {/* Exercise filter */}
      <select
        value={exerciseFilter}
        onChange={(e) => setExerciseFilter(e.target.value)}
        className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">All Exercises</option>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : sets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No sets logged yet</p>
          <p className="text-sm mt-1">Use Quick Log to record a set, or log sets during a workout</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateSets]) => (
            <div key={date}>
              <h2 className="text-sm font-medium text-gray-400 mb-3 sticky top-14 lg:top-0 bg-gray-950 py-1 z-10">{date}</h2>
              <div className="space-y-2">
                {dateSets.map((set) => {
                  const isActive = swipeId === set.id;
                  const offset = isActive ? swipeX : 0;
                  return (
                    <div key={set.id} className="relative overflow-hidden rounded-lg">
                      {/* Swipe background indicators */}
                      {offset > 0 && (
                        <div className="absolute inset-0 bg-blue-500/20 flex items-center pl-4">
                          <span className="text-blue-400 text-sm font-medium">Edit</span>
                        </div>
                      )}
                      {offset < 0 && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-end pr-4">
                          <span className="text-red-400 text-sm font-medium">Delete</span>
                        </div>
                      )}
                      <div
                        className={`bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-center gap-3 relative transition-transform z-10 ${
                          deleting === set.id ? "opacity-50" : ""
                        }`}
                        style={{ transform: `translateX(${offset}px)` }}
                        onTouchStart={(e) => handleTouchStart(set.id, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                      >
                        {set.exercise.imageUrl ? (
                          <img src={set.exercise.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-700 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link href={`/exercises/${set.exerciseId}`} className="font-medium text-white hover:text-emerald-500 transition-colors truncate">
                              {set.exercise.name}
                            </Link>
                            <span className="text-xs text-gray-500">Set {set.setNumber}</span>
                            {set.setType !== "working" && (
                              <span className={`text-xs font-bold ${setTypeColor[set.setType] || "text-gray-400"}`}>
                                {setTypeLabel[set.setType] || set.setType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                            {set.weightLbs != null && <span>{set.weightLbs} lbs</span>}
                            {set.reps != null && <span>{set.reps} reps</span>}
                            {set.timeSecs != null && <span>{set.timeSecs}s</span>}
                            {set.rpe != null && (
                              <span className="group relative cursor-help">
                                RPE {set.rpe}
                                <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-48 px-3 py-2 text-xs font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                                  Rate of Perceived Exertion (1-10). How hard the set felt, where 10 is max effort.
                                </span>
                              </span>
                            )}
                            {set.workout ? (
                              <Link href={`/workouts/${set.workout.id}`} className="text-xs text-emerald-500/70 hover:text-emerald-500">
                                {set.workout.name}
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-600">Quick log</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">
                          {new Date(set.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Set Modal */}
      {editingSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditingSet(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit Set</h2>
              <button onClick={() => setEditingSet(null)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{editingSet.exercise.name} - Set {editingSet.setNumber}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editForm.weightLbs}
                    onChange={(e) => setEditForm({ ...editForm, weightLbs: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reps</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editForm.reps}
                    onChange={(e) => setEditForm({ ...editForm, reps: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">RPE</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  max="10"
                  step="0.5"
                  value={editForm.rpe}
                  onChange={(e) => setEditForm({ ...editForm, rpe: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Optional notes"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSet(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={editSaving}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Log Modal */}
      {showQuickLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowQuickLog(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Quick Log</h2>
              <button onClick={() => setShowQuickLog(false)} className="text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleQuickLog} className="space-y-4">
              {/* Exercise selector */}
              {!selectedExercise ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Exercise</label>
                  <input
                    type="text"
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {filteredExercises.slice(0, 20).map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => { setForm({ ...form, exerciseId: ex.id }); setExerciseSearch(""); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-3"
                      >
                        {ex.imageUrl ? (
                          <img src={ex.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-700 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{ex.name}</p>
                          <p className="text-xs text-gray-500">{ex.muscleGroups}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  {selectedExercise.imageUrl ? (
                    <img src={selectedExercise.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">{selectedExercise.name}</p>
                    <p className="text-xs text-gray-500">{selectedExercise.muscleGroups}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, exerciseId: "" })}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {selectedExercise && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={form.weightLbs}
                        onChange={(e) => setForm({ ...form, weightLbs: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Reps</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form.reps}
                        onChange={(e) => setForm({ ...form, reps: e.target.value })}
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
                        value={form.timeSecs}
                        onChange={(e) => setForm({ ...form, timeSecs: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        <span className="group relative inline-flex items-center gap-1 cursor-help">
                          RPE
                          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-48 px-3 py-2 text-xs font-normal text-gray-300 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                            Rate of Perceived Exertion (1-10). How hard the set felt, where 10 is max effort.
                          </span>
                        </span>
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="10"
                        step="0.5"
                        value={form.rpe}
                        onChange={(e) => setForm({ ...form, rpe: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Set Type</label>
                    <select
                      value={form.setType}
                      onChange={(e) => setForm({ ...form, setType: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="warmup">Warmup</option>
                      <option value="working">Working</option>
                      <option value="dropset">Dropset</option>
                      <option value="failure">Failure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Notes</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                      disabled={saving}
                      className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Log Set"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
