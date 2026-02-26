"use client";

import { useEffect, useState } from "react";
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
  exercise: Exercise;
}

interface Template {
  id: string;
  name: string;
  folder: string | null;
  notes: string | null;
  exercises: TemplateExercise[];
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formFolder, setFormFolder] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formExercises, setFormExercises] = useState<{ exerciseId: string; sets: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          folder: formFolder || null,
          notes: formNotes || null,
          exercises: formExercises.map((ex, i) => ({
            exerciseId: ex.exerciseId,
            order: i + 1,
            sets: ex.sets,
          })),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormName("");
        setFormFolder("");
        setFormNotes("");
        setFormExercises([]);
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

  const addExerciseToForm = () => {
    if (allExercises.length === 0) return;
    setFormExercises((prev) => [...prev, { exerciseId: allExercises[0].id, sets: 3 }]);
  };

  const removeExerciseFromForm = (index: number) => {
    setFormExercises((prev) => prev.filter((_, i) => i !== index));
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
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create Template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Push Day A"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Folder</label>
              <input
                type="text"
                value={formFolder}
                onChange={(e) => setFormFolder(e.target.value)}
                placeholder="e.g., PPL Split"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Exercises</label>
              <button
                type="button"
                onClick={addExerciseToForm}
                className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
            {formExercises.length === 0 && (
              <p className="text-sm text-gray-500">No exercises added yet</p>
            )}
            <div className="space-y-2">
              {formExercises.map((fe, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm w-6 shrink-0">{i + 1}.</span>
                  <select
                    value={fe.exerciseId}
                    onChange={(e) => {
                      const updated = [...formExercises];
                      updated[i] = { ...updated[i], exerciseId: e.target.value };
                      setFormExercises(updated);
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {allExercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={fe.sets}
                    onChange={(e) => {
                      const updated = [...formExercises];
                      updated[i] = { ...updated[i], sets: parseInt(e.target.value) || 3 };
                      setFormExercises(updated);
                    }}
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-gray-500 text-xs">sets</span>
                  <button
                    type="button"
                    onClick={() => removeExerciseFromForm(i)}
                    className="text-gray-500 hover:text-red-400"
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
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Template"}
            </button>
          </div>
        </form>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-lg">No templates yet</p>
          <p className="text-sm mt-1">Create a template to quickly start workouts</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{t.name}</h3>
                  {t.folder && <p className="text-xs text-gray-500 mt-0.5">{t.folder}</p>}
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting === t.id}
                  className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {t.notes && <p className="text-sm text-gray-400 mb-3">{t.notes}</p>}

              <div className="space-y-1.5 flex-1 mb-4">
                {t.exercises.map((te) => (
                  <div key={te.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{te.exercise.name}</span>
                    <span className="text-gray-500">{te.sets} sets</span>
                  </div>
                ))}
                {t.exercises.length === 0 && (
                  <p className="text-sm text-gray-600">No exercises</p>
                )}
              </div>

              <Link
                href={`/workouts/new?templateId=${t.id}`}
                className="w-full text-center bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-medium py-2 rounded-lg transition-colors text-sm"
              >
                Start from Template
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
