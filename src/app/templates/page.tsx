"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Exercise {
  id: string;
  name: string;
  muscleGroups: string;
}

interface TemplateExercise {
  id: string;
  exerciseId: string;
  order: number;
  sets: number;
  defaultWeightLbs: number | null;
  defaultReps: number | null;
  exercise: Exercise;
}

interface Template {
  id: string;
  name: string;
  folder: string | null;
  notes: string | null;
  exercises: TemplateExercise[];
}

interface FormExercise {
  exerciseId: string;
  sets: number;
  defaultWeightLbs: string;
  defaultReps: string;
}

function TemplateForm({
  initialName,
  initialFolder,
  initialNotes,
  initialExercises,
  allExercises,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  initialFolder: string;
  initialNotes: string;
  initialExercises: FormExercise[];
  allExercises: Exercise[];
  submitLabel: string;
  saving: boolean;
  onSubmit: (name: string, folder: string, notes: string, exercises: FormExercise[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [folder, setFolder] = useState(initialFolder);
  const [notes, setNotes] = useState(initialNotes);
  const [exercises, setExercises] = useState<FormExercise[]>(initialExercises);

  const addExercise = () => {
    if (allExercises.length === 0) return;
    setExercises((prev) => [
      ...prev,
      { exerciseId: allExercises[0].id, sets: 3, defaultWeightLbs: "", defaultReps: "" },
    ]);
  };

  const removeExercise = (i: number) => setExercises((prev) => prev.filter((_, idx) => idx !== i));

  const update = (i: number, patch: Partial<FormExercise>) => {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit(name, folder, notes, exercises);
      }}
      className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Push Day A"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Folder</label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="e.g., PPL Split"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">Exercises</label>
          <button
            type="button"
            onClick={addExercise}
            className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>

        {/* Column headers */}
        {exercises.length > 0 && (
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="w-5 shrink-0" />
            <span className="flex-1 text-[11px] text-gray-500">Exercise</span>
            <span className="w-12 text-[11px] text-gray-500 text-center">Sets</span>
            <span className="w-16 text-[11px] text-gray-500 text-center">Lbs</span>
            <span className="w-12 text-[11px] text-gray-500 text-center">Reps</span>
            <span className="w-4 shrink-0" />
          </div>
        )}

        {exercises.length === 0 && <p className="text-sm text-gray-500">No exercises added yet</p>}
        <div className="space-y-2">
          {exercises.map((fe, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-gray-500 text-sm w-5 shrink-0">{i + 1}.</span>
              <select
                value={fe.exerciseId}
                onChange={(e) => update(i, { exerciseId: e.target.value })}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {allExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                max={20}
                value={fe.sets}
                onChange={(e) => update(i, { sets: parseInt(e.target.value) || 3 })}
                className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="number"
                min={0}
                step={2.5}
                value={fe.defaultWeightLbs}
                onChange={(e) => update(i, { defaultWeightLbs: e.target.value })}
                placeholder="—"
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <input
                type="number"
                min={0}
                value={fe.defaultReps}
                onChange={(e) => update(i, { defaultReps: e.target.value })}
                placeholder="—"
                className="w-12 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => removeExercise(i)}
                className="text-gray-500 hover:text-red-400 w-4 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data) => setAllExercises(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingId]);

  const handleCreate = async (name: string, folder: string, notes: string, exercises: FormExercise[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          folder: folder || null,
          notes: notes || null,
          exercises: exercises.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            order: i + 1,
            sets: ex.sets,
            defaultWeightLbs: ex.defaultWeightLbs ? parseFloat(ex.defaultWeightLbs) : null,
            defaultReps: ex.defaultReps ? parseInt(ex.defaultReps) : null,
          })),
        }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        fetchTemplates();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, name: string, folder: string, notes: string, exercises: FormExercise[]) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          folder: folder || null,
          notes: notes || null,
          exercises: exercises.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            order: i + 1,
            sets: ex.sets,
            defaultWeightLbs: ex.defaultWeightLbs ? parseFloat(ex.defaultWeightLbs) : null,
            defaultReps: ex.defaultReps ? parseInt(ex.defaultReps) : null,
          })),
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchTemplates();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (t: Template) => {
    setShowCreateForm(false);
    setEditingId(t.id);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Workout Templates</h1>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingId(null);
          }}
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Create Template</h2>
          <TemplateForm
            initialName=""
            initialFolder=""
            initialNotes=""
            initialExercises={[]}
            allExercises={allExercises}
            submitLabel="Create Template"
            saving={saving}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showCreateForm ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-lg">No templates yet</p>
          <p className="text-sm mt-1">Create a template to quickly start workouts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className={editingId === t.id ? "col-span-full" : ""}>
              {editingId === t.id ? (
                <div ref={editRef}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Edit: {t.name}</h2>
                  </div>
                  <TemplateForm
                    initialName={t.name}
                    initialFolder={t.folder ?? ""}
                    initialNotes={t.notes ?? ""}
                    initialExercises={t.exercises.map((te) => ({
                      exerciseId: te.exerciseId,
                      sets: te.sets,
                      defaultWeightLbs: te.defaultWeightLbs != null ? String(te.defaultWeightLbs) : "",
                      defaultReps: te.defaultReps != null ? String(te.defaultReps) : "",
                    }))}
                    allExercises={allExercises}
                    submitLabel="Save Changes"
                    saving={saving}
                    onSubmit={(name, folder, notes, exercises) => handleUpdate(t.id, name, folder, notes, exercises)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-white truncate">{t.name}</h3>
                      {t.folder && <p className="text-xs text-gray-500 mt-0.5">{t.folder}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => startEdit(t)}
                        title="Edit template"
                        className="text-gray-500 hover:text-blue-400 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        title="Delete template"
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {t.notes && <p className="text-sm text-gray-400 mb-3">{t.notes}</p>}

                  <div className="space-y-1.5 flex-1 mb-4">
                    {t.exercises.map((te) => (
                      <div key={te.id} className="flex items-center justify-between text-sm gap-2">
                        <span className="text-gray-300 truncate">{te.exercise.name}</span>
                        <div className="flex items-center gap-2 shrink-0 text-gray-500 text-xs">
                          <span>{te.sets} sets</span>
                          {te.defaultWeightLbs != null && (
                            <span className="text-gray-600">· {te.defaultWeightLbs} lbs</span>
                          )}
                          {te.defaultReps != null && (
                            <span className="text-gray-600">× {te.defaultReps}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {t.exercises.length === 0 && <p className="text-sm text-gray-600">No exercises</p>}
                  </div>

                  <Link
                    href={`/workouts/new?templateId=${t.id}`}
                    className="w-full text-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-medium py-2 rounded-lg transition-colors text-sm"
                  >
                    Start from Template
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
