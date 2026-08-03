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
        className="flex items-center gap-1 font-bold transition-all active:scale-95 hover:brightness-110"
        style={{
          background: open ? "rgba(251,191,36,0.18)" : "rgba(251,191,36,0.10)",
          border: "1px solid rgba(251,191,36,0.4)",
          color: "#FBBF24",
          fontFamily: "DM Sans, sans-serif",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          borderRadius: "999px",
          padding: isSmall ? "2px 8px 2px 5px" : "4px 10px 4px 7px",
          fontSize: isSmall ? "10px" : "11px",
          cursor: "pointer",
          boxShadow: open ? "0 0 10px rgba(251,191,36,0.2)" : "none",
          transition: "background 0.15s, box-shadow 0.15s",
        }}
        aria-label="Learn about Silent Healing Hz"
      >
        <span
          style={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: "50%",
            background: "#FBBF24",
            display: "inline-block",
            flexShrink: 0,
            boxShadow: "0 0 4px rgba(251,191,36,0.7)",
          }}
        />
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
              lineHeight: 1.65,
              color: "#8FA3BF",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 10,
            }}
          >
            This frequency is below the range of hearing — and that is intentional.
            Your body responds to rhythm the same way it responds to a heartbeat or a tide.
            At this depth, the{" "}
            <strong style={{ color: "#FBBF24" }}>frequency works through resonance</strong>,
            not sound. You will not hear a tone. You will feel a quiet attunement.
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
