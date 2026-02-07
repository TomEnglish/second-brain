"use client";

import { useState, useEffect, useRef } from "react";

interface Document {
  slug: string;
  title: string;
  category: string;
  date?: string;
  content: string;
}

interface DailyNotesBarProps {
  documents: Document[];
  selectedDoc: Document | null;
  onSelectDoc: (doc: Document) => void;
  onDocumentCreated: () => Promise<void>;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateDisplay(date: string): string {
  const d = new Date(date + "T12:00:00"); // Noon to avoid timezone issues
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split("T")[0];
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  if (date === todayStr) return "Today";
  if (date === yesterdayStr) return "Yesterday";
  
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  
  // Add the days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return days;
}

export default function DailyNotesBar({
  documents,
  selectedDoc,
  onSelectDoc,
  onDocumentCreated,
}: DailyNotesBarProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get journal entries sorted by date
  const journalEntries = documents
    .filter((d) => d.category === "journals" && d.date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const journalDates = new Set(journalEntries.map((d) => d.date));

  // Find current position in journal entries
  const currentIndex = selectedDoc?.category === "journals"
    ? journalEntries.findIndex((d) => d.slug === selectedDoc.slug)
    : -1;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < journalEntries.length - 1;
  const prevEntry = hasPrev ? journalEntries[currentIndex - 1] : null;
  const nextEntry = hasNext ? journalEntries[currentIndex + 1] : null;

  // Check if today's entry exists
  const today = getTodayDate();
  const todayEntry = journalEntries.find((d) => d.date === today);
  const isOnToday = selectedDoc?.date === today && selectedDoc?.category === "journals";

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };
    
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendar]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when in journal view
      if (selectedDoc?.category !== "journals") return;
      
      // Alt + Left/Right for prev/next
      if (e.altKey && e.key === "ArrowLeft" && prevEntry) {
        e.preventDefault();
        onSelectDoc(prevEntry);
      }
      if (e.altKey && e.key === "ArrowRight" && nextEntry) {
        e.preventDefault();
        onSelectDoc(nextEntry);
      }
      // Alt + T for today
      if (e.altKey && e.key === "t") {
        e.preventDefault();
        handleTodayClick();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDoc, prevEntry, nextEntry]);

  const handleTodayClick = async () => {
    if (todayEntry) {
      onSelectDoc(todayEntry);
      return;
    }

    // Create today's entry
    setIsCreating(true);
    try {
      const response = await fetch("/api/daily", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create daily note");
      }

      await onDocumentCreated();
    } catch (err) {
      console.error("Failed to create today's note:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCalendarDateClick = async (day: number) => {
    const dateStr = `${calendarDate.year}-${String(calendarDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    
    // Find existing entry for this date
    const entry = journalEntries.find((d) => d.date === dateStr);
    
    if (entry) {
      onSelectDoc(entry);
      setShowCalendar(false);
      return;
    }

    // Create entry for this date (only if it's today or past)
    const selectedDate = new Date(dateStr + "T12:00:00");
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    
    if (selectedDate > now) {
      return; // Can't create future entries
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!response.ok) {
        throw new Error("Failed to create daily note");
      }

      await onDocumentCreated();
      setShowCalendar(false);
    } catch (err) {
      console.error("Failed to create note:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = getMonthDays(calendarDate.year, calendarDate.month);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 border-b border-gray-800">
      {/* Today button */}
      <button
        onClick={handleTodayClick}
        disabled={isCreating}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isOnToday
            ? "bg-indigo-600 text-white"
            : "bg-gray-800 text-gray-300 hover:bg-indigo-600/20 hover:text-indigo-300"
        } disabled:opacity-50`}
        title="Go to today's note (Alt+T)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {isCreating ? "Creating..." : "Today"}
      </button>

      {/* Navigation */}
      {selectedDoc?.category === "journals" && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => prevEntry && onSelectDoc(prevEntry)}
            disabled={!hasPrev}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={prevEntry ? `Previous: ${formatDateDisplay(prevEntry.date || "")} (Alt+←)` : "No previous entry"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm text-gray-400 min-w-[80px] text-center">
            {selectedDoc.date ? formatDateDisplay(selectedDoc.date) : "Unknown date"}
          </span>

          <button
            onClick={() => nextEntry && onSelectDoc(nextEntry)}
            disabled={!hasNext}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={nextEntry ? `Next: ${formatDateDisplay(nextEntry.date || "")} (Alt+→)` : "No next entry"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Calendar picker */}
      <div className="relative ml-auto" ref={calendarRef}>
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className={`p-1.5 rounded transition-colors ${
            showCalendar
              ? "text-indigo-400 bg-indigo-500/20"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
          title="Browse calendar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Calendar dropdown */}
        {showCalendar && (
          <div className="absolute right-0 top-full mt-2 p-3 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 w-72">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalendarDate((prev) => {
                  const newMonth = prev.month - 1;
                  return newMonth < 0
                    ? { year: prev.year - 1, month: 11 }
                    : { ...prev, month: newMonth };
                })}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-sm font-medium text-white">
                {monthNames[calendarDate.month]} {calendarDate.year}
              </span>
              
              <button
                onClick={() => setCalendarDate((prev) => {
                  const newMonth = prev.month + 1;
                  return newMonth > 11
                    ? { year: prev.year + 1, month: 0 }
                    : { ...prev, month: newMonth };
                })}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center text-xs text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} />;
                }

                const dateStr = `${calendarDate.year}-${String(calendarDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEntry = journalDates.has(dateStr);
                const isToday = dateStr === today;
                const isSelected = selectedDoc?.date === dateStr && selectedDoc?.category === "journals";
                const isFuture = new Date(dateStr + "T12:00:00") > new Date();

                return (
                  <button
                    key={day}
                    onClick={() => handleCalendarDateClick(day)}
                    disabled={isFuture && !hasEntry}
                    className={`
                      relative p-2 text-sm rounded-lg transition-all
                      ${isSelected
                        ? "bg-indigo-600 text-white"
                        : isToday
                          ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500"
                          : hasEntry
                            ? "text-white hover:bg-gray-700"
                            : isFuture
                              ? "text-gray-600 cursor-not-allowed"
                              : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                      }
                    `}
                  >
                    {day}
                    {hasEntry && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                <span>Has entry</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded border border-indigo-500 bg-indigo-500/20" />
                <span>Today</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Entry count */}
      <div className="text-xs text-gray-500">
        {journalEntries.length} entries
      </div>
    </div>
  );
}
