"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BodyMetric {
  id: string;
  date: string;
  weightLbs: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}

export default function BodyMetricsPage() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formWeight, setFormWeight] = useState("");
  const [formBodyFat, setFormBodyFat] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editBodyFat, setEditBodyFat] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchMetrics = () => {
    fetch("/api/body-metrics")
      .then((r) => r.json())
      .then((data) => {
        setMetrics(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/body-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          weightLbs: formWeight ? parseFloat(formWeight) : null,
          bodyFatPct: formBodyFat ? parseFloat(formBodyFat) : null,
          notes: formNotes || null,
        }),
      });
      if (res.ok) {
        setFormWeight("");
        setFormBodyFat("");
        setFormNotes("");
        fetchMetrics();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await fetch(`/api/body-metrics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightLbs: editWeight ? parseFloat(editWeight) : null,
          bodyFatPct: editBodyFat ? parseFloat(editBodyFat) : null,
          notes: editNotes || null,
        }),
      });
      setEditingId(null);
      fetchMetrics();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await fetch(`/api/body-metrics/${id}`, { method: "DELETE" });
      fetchMetrics();
    } catch {
      // ignore
    }
  };

  const startEdit = (m: BodyMetric) => {
    setEditingId(m.id);
    setEditWeight(m.weightLbs?.toString() ?? "");
    setEditBodyFat(m.bodyFatPct?.toString() ?? "");
    setEditNotes(m.notes ?? "");
  };

  // Chart data (chronological order)
  const chartData = [...metrics]
    .reverse()
    .filter((m) => m.weightLbs != null)
    .map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: m.weightLbs,
      bodyFat: m.bodyFatPct,
    }));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      <h1 className="text-2xl font-bold">Body Metrics</h1>

      {/* Log form */}
      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Log Entry</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={formWeight}
              onChange={(e) => setFormWeight(e.target.value)}
              placeholder="175.0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Body Fat %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formBodyFat}
              onChange={(e) => setFormBodyFat(e.target.value)}
              placeholder="15.0"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Optional notes"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || (!formWeight && !formBodyFat)}
          className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Log Entry"}
        </button>
      </form>

      {/* Weight Chart */}
      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Weight Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#d1d5db" }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                name="Weight (lbs)"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
              />
              {chartData.some((d) => d.bodyFat != null) && (
                <Line
                  type="monotone"
                  dataKey="bodyFat"
                  name="Body Fat %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-lg font-semibold">History</h2>
        </div>
        {metrics.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No entries yet. Log your first body metric above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-800">
                  <th className="py-2.5 px-4 text-left">Date</th>
                  <th className="py-2.5 px-3 text-right">Weight (lbs)</th>
                  <th className="py-2.5 px-3 text-right">Body Fat %</th>
                  <th className="py-2.5 px-3 text-left">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-gray-800/50">
                    {editingId === m.id ? (
                      <>
                        <td className="py-2 px-4 text-gray-300">{formatDate(m.date)}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.1"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.1"
                            value={editBodyFat}
                            onChange={(e) => setEditBodyFat(e.target.value)}
                            className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => handleUpdate(m.id)}
                              className="text-emerald-500 hover:text-emerald-400 text-xs px-2 py-1"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2.5 px-4 text-gray-300">{formatDate(m.date)}</td>
                        <td className="py-2.5 px-3 text-right text-white">
                          {m.weightLbs != null ? m.weightLbs : "--"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-white">
                          {m.bodyFatPct != null ? `${m.bodyFatPct}%` : "--"}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 max-w-xs truncate">
                          {m.notes ?? "--"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => startEdit(m)}
                              className="text-gray-500 hover:text-emerald-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
