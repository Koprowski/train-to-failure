"use client";

import { useState, useEffect } from "react";

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  onSave: (date: Date) => void;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DateTimePicker({ value, onChange, onClose, onSave }: DateTimePickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [hour, setHour] = useState(value.getHours() % 12 || 12);
  const [minute, setMinute] = useState(value.getMinutes());
  const [ampm, setAmpm] = useState<"AM" | "PM">(value.getHours() >= 12 ? "PM" : "AM");

  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setSelectedDay(value.getDate());
    setHour(value.getHours() % 12 || 12);
    setMinute(value.getMinutes());
    setAmpm(value.getHours() >= 12 ? "PM" : "AM");
  }, [value]);

  const buildDate = (day: number, h: number, m: number, ap: "AM" | "PM") => {
    let hour24 = h % 12;
    if (ap === "PM") hour24 += 12;
    return new Date(viewYear, viewMonth, day, hour24, m);
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    onChange(buildDate(day, hour, minute, ampm));
  };

  const handleHourChange = (h: number) => {
    setHour(h);
    onChange(buildDate(selectedDay, h, minute, ampm));
  };

  const handleMinuteChange = (m: number) => {
    setMinute(m);
    onChange(buildDate(selectedDay, hour, m, ampm));
  };

  const handleAmpmToggle = () => {
    const next = ampm === "AM" ? "PM" : "AM";
    setAmpm(next);
    onChange(buildDate(selectedDay, hour, minute, next));
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDay(now.getDate());
    setHour(now.getHours() % 12 || 12);
    setMinute(now.getMinutes());
    setAmpm(now.getHours() >= 12 ? "PM" : "AM");
    onChange(now);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const today = new Date();
  const isToday = (day: number) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    day === today.getDate();

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl p-5 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {cells.map((day, i) => (
            <button
              key={i}
              disabled={day === null}
              onClick={() => day && handleDayClick(day)}
              className={`h-9 w-full rounded-lg text-sm font-medium transition-colors ${
                day === null
                  ? "invisible"
                  : day === selectedDay && viewMonth === value.getMonth() && viewYear === value.getFullYear()
                    ? "bg-emerald-500 text-white"
                    : isToday(day)
                      ? "bg-gray-700 text-emerald-400"
                      : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Time picker */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700">
            <button
              onClick={() => handleHourChange(hour === 12 ? 1 : hour + 1)}
              className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-white font-mono text-lg w-8 text-center tabular-nums">
              {String(hour).padStart(2, "0")}
            </span>
            <button
              onClick={() => handleHourChange(hour === 1 ? 12 : hour - 1)}
              className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <span className="text-gray-500 text-lg font-bold">:</span>

          <div className="flex items-center bg-gray-800 rounded-lg border border-gray-700">
            <button
              onClick={() => handleMinuteChange(minute === 59 ? 0 : minute + 1)}
              className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <span className="text-white font-mono text-lg w-8 text-center tabular-nums">
              {String(minute).padStart(2, "0")}
            </span>
            <button
              onClick={() => handleMinuteChange(minute === 0 ? 59 : minute - 1)}
              className="px-2 py-1 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleAmpmToggle}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-medium text-sm hover:bg-gray-700 transition-colors"
          >
            {ampm}
          </button>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToToday}
            className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Today
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(buildDate(selectedDay, hour, minute, ampm))}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
