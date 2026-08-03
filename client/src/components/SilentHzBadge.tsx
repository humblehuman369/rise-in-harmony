/**
 * SilentHzBadge — reusable "SILENT HEALING HZ" button badge with tooltip popup.
 *
 * When tapped/clicked, shows an amber tooltip explaining the concept and
 * providing a link to the Silent Healing Hz educational video page.
 */
import { useState, useRef, useEffect } from "react";
import { EarOff, Play } from "lucide-react";

interface SilentHzBadgeProps {
  /** Size variant — "sm" for cards/inline, "md" for panels */
  size?: "sm" | "md";
}

export default function SilentHzBadge({ size = "sm" }: SilentHzBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isSmall = size === "sm";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* Badge button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 font-bold transition-all active:scale-95"
        style={{
          background: "rgba(251,191,36,0.12)",
          border: "1px solid rgba(251,191,36,0.35)",
          color: "#FBBF24",
          fontFamily: "DM Sans, sans-serif",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          borderRadius: isSmall ? "999px" : "10px",
          padding: isSmall ? "2px 7px" : "4px 10px",
          fontSize: isSmall ? "10px" : "11px",
          cursor: "pointer",
        }}
        aria-label="Learn about Silent Healing Hz"
      >
        <EarOff size={isSmall ? 8 : 10} />
        Silent Healing Hz
      </button>

      {/* Tooltip popup */}
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: 240,
            background: "#0F1120",
            border: "1px solid rgba(251,191,36,0.35)",
            borderRadius: 12,
            padding: "12px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(251,191,36,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div style={{
            position: "absolute",
            bottom: -6,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 10,
            height: 10,
            background: "#0F1120",
            border: "1px solid rgba(251,191,36,0.35)",
            borderTop: "none",
            borderLeft: "none",
          }} />

          <p
            style={{
              fontSize: 11,
              lineHeight: 1.6,
              color: "#8FA3BF",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 10,
            }}
          >
            This frequency is below the range of human hearing. It works through{" "}
            <strong style={{ color: "#E8EDF5" }}>brainwave entrainment</strong> — felt as a subtle pulse, not heard as a tone.
          </p>

          <a
            href="/silent-healing"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: "#FBBF24",
              fontFamily: "DM Sans, sans-serif",
              textDecoration: "none",
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            <Play size={10} style={{ fill: "#FBBF24" }} />
            Watch the Silent Healing Hz video
          </a>
        </div>
      )}
    </div>
  );
}
