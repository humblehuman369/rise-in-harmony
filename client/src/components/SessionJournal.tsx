/**
 * SessionJournal — Post-session mood check-in modal
 * 1–5 mood rating + optional note, persisted to localStorage
 * Triggered after a session ends or sleep timer completes
 * Bioluminescent Depth theme
 */
import { useState, useEffect } from "react";
import { X, BookOpen, Smile, Meh, Frown, Laugh, Angry } from "lucide-react";
import { trackMoodLogged } from "@/hooks/useAnalytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  timestamp: number;
  mood: number;           // 1–5
  note: string;
  frequencyHz: number;
  frequencyName: string;
  durationMinutes: number;
}

const JOURNAL_KEY = "rih_journal_entries";

export function loadJournalEntries(): JournalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveJournalEntry(entry: JournalEntry) {
  const entries = loadJournalEntries();
  entries.unshift(entry); // newest first
  // Keep last 90 entries
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 90)));
}

// ─── Mood config ──────────────────────────────────────────────────────────────

const MOODS = [
  { value: 1, label: "Difficult", Icon: Angry,  color: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
  { value: 2, label: "Low",       Icon: Frown,   color: "#F97316", bg: "rgba(249,115,22,0.12)"  },
  { value: 3, label: "Neutral",   Icon: Meh,     color: "#EAB308", bg: "rgba(234,179,8,0.12)"   },
  { value: 4, label: "Good",      Icon: Smile,   color: "#22C55E", bg: "rgba(34,197,94,0.12)"   },
  { value: 5, label: "Radiant",   Icon: Laugh,   color: "#00D4AA", bg: "rgba(0,212,170,0.12)"   },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SessionJournalProps {
  frequencyHz: number;
  frequencyName: string;
  durationMinutes: number;
  onClose: () => void;
  onSaved?: (entry: JournalEntry) => void;
}

export default function SessionJournal({
  frequencyHz,
  frequencyName,
  durationMinutes,
  onClose,
  onSaved,
}: SessionJournalProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Auto-close after save animation
  useEffect(() => {
    if (saved) {
      const t = setTimeout(onClose, 1800);
      return () => clearTimeout(t);
    }
  }, [saved, onClose]);

  const handleSave = () => {
    if (!selectedMood) return;
    const entry: JournalEntry = {
      id: `j_${Date.now()}`,
      timestamp: Date.now(),
      mood: selectedMood,
      note: note.trim(),
      frequencyHz,
      frequencyName,
      durationMinutes,
    };
    saveJournalEntry(entry);
    trackMoodLogged(selectedMood, frequencyHz);
    setSaved(true);
    onSaved?.(entry);
  };

  const activeMood = MOODS.find(m => m.value === selectedMood);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(10,11,20,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{
          background: "linear-gradient(160deg, #12152A, #0D0F1E)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: "#6B7A99", background: "rgba(255,255,255,0.05)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#E8EDF5"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6B7A99"; }}
        >
          <X size={14} />
        </button>

        {saved ? (
          /* Success state */
          <div className="flex flex-col items-center py-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: `${activeMood?.color}20`, border: `2px solid ${activeMood?.color}50` }}
            >
              {activeMood && <activeMood.Icon size={28} style={{ color: activeMood.color }} />}
            </div>
            <h3
              style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.4rem", fontWeight: 600, color: "#E8EDF5" }}
            >
              Session logged
            </h3>
            <p className="text-sm mt-1" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
              Your {durationMinutes}min session has been recorded
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.2)" }}
              >
                <BookOpen size={18} style={{ color: "#00D4AA" }} />
              </div>
              <div>
                <h3
                  style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.25rem", fontWeight: 600, color: "#E8EDF5" }}
                >
                  How do you feel?
                </h3>
                <p className="text-xs" style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}>
                  {frequencyHz}Hz · {frequencyName} · {durationMinutes} min
                </p>
              </div>
            </div>

            {/* Mood selector */}
            <div className="flex gap-2 mb-5">
              {MOODS.map(mood => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    background: selectedMood === mood.value ? mood.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedMood === mood.value ? mood.color + "50" : "rgba(255,255,255,0.06)"}`,
                    transform: selectedMood === mood.value ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  <mood.Icon
                    size={22}
                    style={{ color: selectedMood === mood.value ? mood.color : "#4A5568" }}
                  />
                  <span
                    className="text-[9px] font-semibold"
                    style={{
                      color: selectedMood === mood.value ? mood.color : "#4A5568",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Note */}
            <div className="mb-5">
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#6B7A99", fontFamily: "DM Sans, sans-serif" }}
              >
                Note <span style={{ color: "#4A5568", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What did you notice during this session?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#E8EDF5",
                  fontFamily: "DM Sans, sans-serif",
                  outline: "none",
                  lineHeight: 1.6,
                }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,212,170,0.3)"; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "#6B7A99",
                  fontFamily: "DM Sans, sans-serif",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Skip
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedMood}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
                style={{
                  background: selectedMood
                    ? `linear-gradient(135deg, ${activeMood?.color}, ${activeMood?.color}CC)`
                    : "rgba(255,255,255,0.06)",
                  color: selectedMood ? "#0A0B14" : "#4A5568",
                  fontFamily: "DM Sans, sans-serif",
                  cursor: selectedMood ? "pointer" : "not-allowed",
                  boxShadow: selectedMood ? `0 0 20px ${activeMood?.color}30` : "none",
                }}
              >
                Save Entry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
