/**
 * Journey — Full-Screen Scroll-Snapping Healing Journey
 *
 * Six immersive sections that guide the user through the healing benefits
 * of Rise In Harmony before they begin a session.
 *
 * Design: Bioluminescent Depth dark theme (#0A0B14 bg, #00D4AA teal accent)
 * Layout: CSS scroll-snap with each section filling the viewport
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ─── Chakra / Solfeggio frequency data ────────────────────────────────────────

const SOLFEGGIO = [
  { hz: 174, label: "Pain Relief",        color: "#FF6B6B", x: 28,  y: 18 },
  { hz: 285, label: "Tissue Healing",     color: "#4ECDC4", x: 72,  y: 22 },
  { hz: 396, label: "Liberation",         color: "#A8E6CF", x: 18,  y: 42 },
  { hz: 528, label: "DNA Repair",         color: "#FFD93D", x: 78,  y: 45 },
  { hz: 639, label: "Connection",         color: "#FF8B94", x: 22,  y: 66 },
  { hz: 741, label: "Awakening",          color: "#6C5CE7", x: 76,  y: 68 },
  { hz: 852, label: "Spiritual Order",    color: "#A29BFE", x: 30,  y: 84 },
  { hz: 963, label: "Divine Consciousness", color: "#00D4AA", x: 68, y: 86 },
];

const PROGRAMS = [
  {
    icon: "✦",
    title: "Reiki Healing",
    subtitle: "432Hz precision session",
    benefit: "Align your energy field and restore inner balance with the universal healing frequency.",
    href: "/reiki",
    color: "#00D4AA",
  },
  {
    icon: "◎",
    title: "Sleep Frequencies",
    subtitle: "Delta & Theta waves",
    benefit: "Drift into deep, restorative sleep guided by scientifically tuned brainwave entrainment.",
    href: "/player",
    color: "#6C5CE7",
  },
  {
    icon: "⬡",
    title: "Solfeggio Studio",
    subtitle: "25 healing tones",
    benefit: "Explore the full Solfeggio scale — from 174Hz pain relief to 963Hz divine consciousness.",
    href: "/studio",
    color: "#FFD93D",
  },
  {
    icon: "⟳",
    title: "Convert Your Music",
    subtitle: "432Hz re-tuning",
    benefit: "Transform any audio file to 432Hz — the natural tuning that resonates with the human body.",
    href: "/convert",
    color: "#FF8B94",
  },
];

const SCIENCE = [
  {
    title: "Brainwave Entrainment",
    body: "Specific frequencies guide your brain into alpha, theta, and delta states — the same states reached in deep meditation and restorative sleep.",
    icon: "≋",
    color: "#00D4AA",
  },
  {
    title: "Solfeggio Resonance",
    body: "The ancient Solfeggio scale (174–963Hz) has been used for centuries in sacred music. Modern research links these tones to cellular repair, emotional release, and spiritual clarity.",
    icon: "◈",
    color: "#A29BFE",
  },
  {
    title: "DDS Precision Synthesis",
    body: "Rise In Harmony uses Direct Digital Synthesis to generate frequencies accurate to 0.01Hz — far beyond what recorded audio can achieve. Every tone is mathematically pure.",
    icon: "⟁",
    color: "#FFD93D",
  },
];

// ─── Animated components ───────────────────────────────────────────────────────

/** Pulsing teal rings for Section 1 */
function PulseRings({ active }: { active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: `${120 + i * 90}px`,
            height: `${120 + i * 90}px`,
            borderColor: `rgba(0,212,170,${0.35 - i * 0.06})`,
            animation: active ? `journey-ring-expand ${2.5 + i * 0.4}s ease-out ${i * 0.5}s infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

/** Animated human silhouette with chakra points */
function FrequencyBody({ active }: { active: boolean }) {
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    if (!active) { setLit(-1); return; }
    let i = 0;
    const interval = setInterval(() => {
      setLit(i % SOLFEGGIO.length);
      i++;
    }, 600);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: "420px" }}>
      {/* Human silhouette SVG */}
      <svg
        viewBox="0 0 200 420"
        className="absolute inset-0 w-full h-full"
        style={{ filter: "drop-shadow(0 0 24px rgba(0,212,170,0.25))" }}
      >
        {/* Body glow */}
        <defs>
          <radialGradient id="bodyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0A0B14" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="chakraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00D4AA" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="210" rx="80" ry="190" fill="url(#bodyGlow)" />
        {/* Head */}
        <circle cx="100" cy="42" r="28" fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="1.5" />
        {/* Neck */}
        <line x1="90" y1="68" x2="90" y2="85" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        <line x1="110" y1="68" x2="110" y2="85" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        {/* Torso */}
        <path d="M 75 85 Q 60 120 65 200 Q 70 260 80 300 L 120 300 Q 130 260 135 200 Q 140 120 125 85 Z"
          fill="none" stroke="rgba(0,212,170,0.25)" strokeWidth="1.5" />
        {/* Arms */}
        <path d="M 75 95 Q 45 130 38 180 Q 35 200 40 210" fill="none" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        <path d="M 125 95 Q 155 130 162 180 Q 165 200 160 210" fill="none" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        {/* Legs */}
        <path d="M 80 300 Q 75 340 72 380 Q 70 400 74 415" fill="none" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        <path d="M 120 300 Q 125 340 128 380 Q 130 400 126 415" fill="none" stroke="rgba(0,212,170,0.2)" strokeWidth="1.5" />
        {/* Chakra spine line */}
        <line x1="100" y1="42" x2="100" y2="300" stroke="rgba(0,212,170,0.12)" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Frequency labels */}
      {SOLFEGGIO.map((freq, i) => {
        const isLit = lit === i;
        return (
          <div
            key={freq.hz}
            className="absolute flex items-center gap-1.5 transition-all duration-500"
            style={{
              left: `${freq.x}%`,
              top: `${freq.y}%`,
              transform: "translate(-50%, -50%)",
              opacity: isLit ? 1 : 0.35,
            }}
          >
            {/* Dot */}
            <div
              className="rounded-full flex-shrink-0 transition-all duration-300"
              style={{
                width: isLit ? "10px" : "6px",
                height: isLit ? "10px" : "6px",
                background: freq.color,
                boxShadow: isLit ? `0 0 12px ${freq.color}` : "none",
              }}
            />
            {/* Label */}
            <div className="text-left" style={{ minWidth: "80px" }}>
              <div className="text-xs font-bold leading-tight" style={{ color: freq.color, fontFamily: "DM Sans, sans-serif", fontSize: "10px" }}>
                {freq.hz} Hz
              </div>
              <div className="text-xs leading-tight" style={{ color: "rgba(232,237,245,0.7)", fontFamily: "DM Sans, sans-serif", fontSize: "9px" }}>
                {freq.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Sacred geometry triangle */
function HealingTriangle({ active }: { active: boolean }) {
  const [pulse, setPulse] = useState(0); // 0=body, 1=mind, 2=soul

  useEffect(() => {
    if (!active) { setPulse(0); return; }
    let i = 0;
    const interval = setInterval(() => {
      setPulse(i % 3);
      i++;
    }, 1200);
    return () => clearInterval(interval);
  }, [active]);

  const vertices = [
    { label: "Soul Healing",  sub: "963Hz Crown",     color: "#FFD93D", cx: 200, cy: 30  },
    { label: "Body Healing",  sub: "174Hz Foundation", color: "#FF6B6B", cx: 40,  cy: 310 },
    { label: "Mind Healing",  sub: "852Hz Intuition",  color: "#A29BFE", cx: 360, cy: 310 },
  ];

  const center = { cx: 200, cy: 217 };

  return (
    <div className="relative w-full max-w-md mx-auto" style={{ height: "380px" }}>
      <svg viewBox="0 0 400 360" className="absolute inset-0 w-full h-full">
        <defs>
          <radialGradient id="triGlow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0A0B14" stopOpacity="0" />
          </radialGradient>
          {vertices.map((v, i) => (
            <radialGradient key={i} id={`vGlow${i}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={v.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={v.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Background glow */}
        <ellipse cx="200" cy="200" rx="180" ry="160" fill="url(#triGlow)" />

        {/* Outer triangle */}
        <polygon
          points={vertices.map(v => `${v.cx},${v.cy}`).join(" ")}
          fill="none"
          stroke="rgba(0,212,170,0.25)"
          strokeWidth="1.5"
        />

        {/* Inner inverted triangle */}
        <polygon
          points="200,120 120,270 280,270"
          fill="rgba(0,212,170,0.04)"
          stroke="rgba(0,212,170,0.15)"
          strokeWidth="1"
        />

        {/* Center "Healing" label */}
        <text x="200" y="210" textAnchor="middle" fill="rgba(0,212,170,0.8)"
          fontSize="14" fontFamily="Cormorant Garamond, serif" fontStyle="italic">
          Healing
        </text>

        {/* Lines from center to vertices */}
        {vertices.map((v, i) => (
          <line
            key={i}
            x1={center.cx} y1={center.cy}
            x2={v.cx} y2={v.cy}
            stroke={pulse === i ? v.color : "rgba(255,255,255,0.08)"}
            strokeWidth={pulse === i ? 1.5 : 0.8}
            style={{ transition: "stroke 0.4s, stroke-width 0.4s" }}
          />
        ))}

        {/* Vertex circles */}
        {vertices.map((v, i) => (
          <g key={i}>
            <circle
              cx={v.cx} cy={v.cy} r={pulse === i ? 18 : 12}
              fill={`url(#vGlow${i})`}
              style={{ transition: "r 0.4s" }}
            />
            <circle
              cx={v.cx} cy={v.cy} r={pulse === i ? 8 : 5}
              fill={v.color}
              opacity={pulse === i ? 1 : 0.5}
              style={{ transition: "r 0.4s, opacity 0.4s" }}
            />
          </g>
        ))}
      </svg>

      {/* Vertex labels */}
      {vertices.map((v, i) => {
        const isActive = pulse === i;
        const labelX = v.cx < 100 ? "left-0" : v.cx > 300 ? "right-0" : "left-1/2 -translate-x-1/2";
        const labelY = v.cy < 100 ? "top-0" : "bottom-0";
        return (
          <div
            key={i}
            className={`absolute text-center transition-all duration-400 ${labelX} ${labelY}`}
            style={{ opacity: isActive ? 1 : 0.5 }}
          >
            <div className="text-sm font-bold" style={{ color: v.color, fontFamily: "DM Sans, sans-serif" }}>
              {v.label}
            </div>
            <div className="text-xs" style={{ color: "rgba(232,237,245,0.5)", fontFamily: "DM Sans, sans-serif" }}>
              {v.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Animated waveform for Section 5 */
function WaveformViz({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Three overlapping waves
      const waves = [
        { freq: 0.02, amp: 28, color: "#00D4AA", phase: 0 },
        { freq: 0.035, amp: 18, color: "#A29BFE", phase: Math.PI / 3 },
        { freq: 0.015, amp: 14, color: "#FFD93D", phase: Math.PI / 1.5 },
      ];

      waves.forEach(({ freq, amp, color, phase }) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        for (let x = 0; x <= W; x++) {
          const y = H / 2 + amp * Math.sin(freq * x + tRef.current + phase);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      tRef.current += 0.025;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={100}
      className="w-full max-w-xl mx-auto block"
      style={{ opacity: active ? 1 : 0, transition: "opacity 0.8s" }}
    />
  );
}

/** Mini 432Hz visualizer for Section 6 */
function BeginVisualizer({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const t = tRef.current;

      // Pulsing rings
      for (let i = 0; i < 7; i++) {
        const phase = (i / 7) * Math.PI * 2;
        const r = 40 + i * 22 + 8 * Math.sin(t * 4 + phase);
        const alpha = 0.5 - i * 0.06;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,212,170,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Orbiting particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + t * 0.8;
        const r = 80 + 12 * Math.sin(t * 4 + i);
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,170,${0.6 + 0.4 * Math.sin(t * 4 + i)})`;
        ctx.fill();
      }

      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
      grad.addColorStop(0, "rgba(0,212,170,0.4)");
      grad.addColorStop(1, "rgba(0,212,170,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      tRef.current += 0.016;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="mx-auto block"
      style={{ opacity: active ? 1 : 0, transition: "opacity 1s" }}
    />
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  id,
  children,
  className = "",
  style = {},
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      id={id}
      className={`relative flex flex-col items-center justify-center px-6 py-12 ${className}`}
      style={{
        minHeight: "100dvh",
        scrollSnapAlign: "start",
        scrollSnapStop: "always",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

// ─── Scroll indicator ──────────────────────────────────────────────────────────

function ScrollDots({ total, current }: { total: number; current: number }) {
  return (
    <div
      className="fixed right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50"
      style={{ display: "flex" }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? "8px" : "6px",
            height: i === current ? "8px" : "6px",
            background: i === current ? "#00D4AA" : "rgba(255,255,255,0.25)",
            boxShadow: i === current ? "0 0 8px rgba(0,212,170,0.6)" : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Journey() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const activeSectionRef = useRef(0);
  const TOTAL = 6;

  // Keep ref in sync with state so keyboard/touch handlers always have the latest value
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);

  // ── Helper: scroll to a specific section index ──────────────────────────
  const scrollToSection = useCallback((idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const clamped = Math.max(0, Math.min(idx, TOTAL - 1));
    container.scrollTo({ top: clamped * container.clientHeight, behavior: "smooth" });
  }, []);

  // ── Track which section is in view (scroll listener) ────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const sectionHeight = container.clientHeight;
      const idx = Math.round(scrollTop / sectionHeight);
      setActiveSection(Math.min(idx, TOTAL - 1));
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Keyboard navigation: ArrowDown / ArrowUp / PageDown / PageUp ─────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only intercept when the journey container (or its children) has focus,
      // or when no specific input element is focused.
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToSection(activeSectionRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToSection(activeSectionRef.current - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scrollToSection]);

  // ── Touch / swipe navigation ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchStartTime = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchStartY - e.changedTouches[0].clientY;
      const dt = Date.now() - touchStartTime;
      // Require a meaningful swipe: ≥40px in ≤400ms
      if (Math.abs(dy) < 40 || dt > 400) return;
      e.preventDefault();
      if (dy > 0) {
        scrollToSection(activeSectionRef.current + 1); // swipe up → next
      } else {
        scrollToSection(activeSectionRef.current - 1); // swipe down → prev
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollToSection]);

  // ── IntersectionObserver: reveal .journey-reveal elements ────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger siblings: find position among .journey-reveal siblings
            const parent = entry.target.parentElement;
            const siblings = parent
              ? Array.from(parent.querySelectorAll(".journey-reveal"))
              : [entry.target];
            const idx = siblings.indexOf(entry.target as Element);
            const delay = idx * 80; // 80ms stagger
            setTimeout(() => {
              (entry.target as HTMLElement).classList.add("is-visible");
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: container,
        threshold: 0.15,
      }
    );

    // Observe all reveal targets inside the container
    const targets = container.querySelectorAll(".journey-reveal");
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToNext = useCallback(() => {
    scrollToSection(activeSectionRef.current + 1);
  }, [scrollToSection]);

  const handleBegin = useCallback(() => {
    if (isAuthenticated) {
      navigate("/reiki");
    } else {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, navigate]);

  return (
    <Layout>
      {/* Scroll-snap container fills the main content area */}
      <div
        ref={containerRef}
        style={{
          height: "calc(100dvh - 0px)",
          overflowY: "scroll",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          background: "#0A0B14",
        }}
      >
        {/* ── Section 1: The Invitation ───────────────────────────────────── */}
        <Section id="s1" style={{ background: "radial-gradient(ellipse at 50% 60%, rgba(0,212,170,0.08) 0%, #0A0B14 70%)" }}>
          <PulseRings active={activeSection === 0} />

          <div className="relative z-10 text-center max-w-lg mx-auto">
            {/* Badge */}
            <div
              className="journey-reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              <span>✦</span> Healing Frequencies
            </div>

            {/* Headline */}
            <h1
              className="journey-reveal text-5xl md:text-6xl font-bold leading-tight mb-6"
              style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}
            >
              Rise Into
              <br />
              <span style={{ color: "#00D4AA" }}>Harmony</span>
            </h1>

            {/* Value prop */}
            <p
              className="journey-reveal text-lg leading-relaxed mb-4"
              style={{ color: "rgba(232,237,245,0.65)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}
            >
              Trusted frequencies that heal your mind, body, and soul.
              <br />
              No medication. No expensive therapy. Just sound.
            </p>
            <p
              className="journey-reveal text-sm mb-10"
              style={{ color: "rgba(232,237,245,0.4)", fontFamily: "DM Sans, sans-serif", transitionDelay: "220ms" }}
            >
              Precision-synthesized to 0.01Hz accuracy using DDS technology.
            </p>

            {/* CTA */}
            <button
              onClick={scrollToNext}
              className="journey-reveal btn-teal px-8 py-3.5 rounded-full text-base font-semibold transition-transform active:scale-97"
              style={{ fontFamily: "DM Sans, sans-serif", transitionDelay: "300ms" }}
            >
              Begin the Journey →
            </button>
          </div>

          {/* Scroll hint */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer"
            onClick={scrollToNext}
            style={{ color: "rgba(232,237,245,0.3)", fontFamily: "DM Sans, sans-serif", fontSize: "11px" }}
          >
            <span>Scroll to explore</span>
            <div style={{ animation: "journey-bounce 2s ease-in-out infinite" }}>↓</div>
          </div>
        </Section>

        {/* ── Section 2: Your Frequency Body ─────────────────────────────── */}
        <Section id="s2" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(108,92,231,0.07) 0%, #0A0B14 70%)" }}>
          <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
            {/* Eyebrow */}
            <div className="journey-reveal text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
              Soothe Your Body
            </div>
            <h2 className="journey-reveal text-3xl md:text-4xl font-bold mb-2" style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}>
              Every Cell Remembers
            </h2>
            <p className="journey-reveal text-sm mb-8 max-w-md mx-auto" style={{ color: "rgba(232,237,245,0.5)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}>
              Solfeggio frequencies resonate with specific tissues and energy centres.
              Watch them light up as each tone activates its healing domain.
            </p>

            <FrequencyBody active={activeSection === 1} />

            <button
              onClick={scrollToNext}
              className="mt-8 px-6 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              Continue →
            </button>
          </div>
        </Section>

        {/* ── Section 3: The Healing Triangle ────────────────────────────── */}
        <Section id="s3" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,211,61,0.05) 0%, #0A0B14 70%)" }}>
          <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
            <div className="journey-reveal text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "#FFD93D", fontFamily: "DM Sans, sans-serif" }}>
              Beyond Sound
            </div>
            <h2 className="journey-reveal text-3xl md:text-4xl font-bold mb-2" style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}>
              A Full-Body Neural Symphony
            </h2>
            <p className="journey-reveal text-sm mb-8 max-w-md mx-auto" style={{ color: "rgba(232,237,245,0.5)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}>
              Rise In Harmony is an integrated system for your entire being —
              body, mind, and soul — built on validated scientific principles.
            </p>

            <HealingTriangle active={activeSection === 2} />

            {/* Science footnotes */}
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
              {[
                { label: "Chronobiology", note: "Aligns with sleep-rhythm research" },
                { label: "Brainwave Entrainment", note: "Guides brain to focus or rest" },
                { label: "Safe & Drug-Free", note: "Just resonance power" },
                { label: "Emotional Harmony", note: "Soothes the nervous system" },
              ].map(({ label, note }) => (
                <div key={label} className="text-xs" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  <span className="font-semibold" style={{ color: "#00D4AA" }}>{label}:</span>{" "}
                  <span style={{ color: "rgba(232,237,245,0.45)" }}>{note}</span>
                </div>
              ))}
            </div>

            <button
              onClick={scrollToNext}
              className="mt-8 px-6 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              Continue →
            </button>
          </div>
        </Section>

        {/* ── Section 4: Your Programs ────────────────────────────────────── */}
        <Section id="s4" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(0,212,170,0.06) 0%, #0A0B14 70%)" }}>
          <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
            <div className="journey-reveal text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
              Included Programs
            </div>
            <h2 className="journey-reveal text-3xl md:text-4xl font-bold mb-2" style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}>
              Real Support, Real Results
            </h2>
            <p className="journey-reveal text-sm mb-8 max-w-md mx-auto" style={{ color: "rgba(232,237,245,0.5)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}>
              More affordable than supplements. Works even if other methods haven't.
              One subscription covers everything.
            </p>

            {/* Value checklist */}
            <div
              className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-8 max-w-md mx-auto"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {[
                "Natural help for sleep, mood & daily calm",
                "No pills, no side effects",
                "Works even if other methods haven't",
                "One simple subscription",
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-left">
                  <span style={{ color: "#00D4AA" }}>✓</span>
                  <span style={{ color: "rgba(232,237,245,0.65)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Program cards */}
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {PROGRAMS.map(prog => (
                <button
                  key={prog.title}
                  onClick={() => navigate(prog.href)}
                  className="glow-card text-left p-4 rounded-2xl transition-transform active:scale-97"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${prog.color}22`,
                  }}
                >
                  <div className="text-2xl mb-2" style={{ color: prog.color }}>{prog.icon}</div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}>
                    {prog.title}
                  </div>
                  <div className="text-xs mb-2" style={{ color: prog.color, fontFamily: "DM Sans, sans-serif" }}>
                    {prog.subtitle}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "rgba(232,237,245,0.45)", fontFamily: "DM Sans, sans-serif" }}>
                    {prog.benefit}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={scrollToNext}
              className="mt-8 px-6 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              Continue →
            </button>
          </div>
        </Section>

        {/* ── Section 5: Why It Works ─────────────────────────────────────── */}
        <Section id="s5" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(162,155,254,0.07) 0%, #0A0B14 70%)" }}>
          <div className="relative z-10 w-full max-w-2xl mx-auto text-center">
            <div className="journey-reveal text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "#A29BFE", fontFamily: "DM Sans, sans-serif" }}>
              The Science
            </div>
            <h2 className="journey-reveal text-3xl md:text-4xl font-bold mb-2" style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}>
              Why It Works
            </h2>
            <p className="journey-reveal text-sm mb-8 max-w-md mx-auto" style={{ color: "rgba(232,237,245,0.5)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}>
              Three interlocking principles — ancient wisdom validated by modern research.
            </p>

            <WaveformViz active={activeSection === 4} />

            <div className="mt-8 grid grid-cols-1 gap-4 max-w-lg mx-auto text-left">
              {SCIENCE.map(item => (
                <div
                  key={item.title}
                  className="flex gap-4 p-4 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${item.color}22` }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${item.color}15`, color: item.color }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold mb-1" style={{ color: item.color, fontFamily: "DM Sans, sans-serif" }}>
                      {item.title}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "rgba(232,237,245,0.55)", fontFamily: "DM Sans, sans-serif" }}>
                      {item.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={scrollToNext}
              className="mt-8 px-6 py-2.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.25)", color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}
            >
              I'm Ready →
            </button>
          </div>
        </Section>

        {/* ── Section 6: Begin ────────────────────────────────────────────── */}
        <Section
          id="s6"
          style={{
            background: "radial-gradient(ellipse at 50% 45%, rgba(0,212,170,0.14) 0%, rgba(0,184,148,0.06) 40%, #0A0B14 75%)",
          }}
        >
          <div className="relative z-10 text-center max-w-lg mx-auto">
            <BeginVisualizer active={activeSection === 5} />

            <div className="mt-4">
              <div className="journey-reveal text-xs font-medium mb-3 tracking-widest uppercase" style={{ color: "#00D4AA", fontFamily: "DM Sans, sans-serif" }}>
                432Hz · Precision DDS
              </div>
              <h2
                className="journey-reveal text-4xl md:text-5xl font-bold mb-4"
                style={{ color: "#E8EDF5", fontFamily: "Cormorant Garamond, serif", transitionDelay: "80ms" }}
              >
                Begin Your
                <br />
                <span style={{ color: "#00D4AA" }}>Healing Journey</span>
              </h2>
              <p
                className="journey-reveal text-base mb-8 max-w-sm mx-auto"
                style={{ color: "rgba(232,237,245,0.55)", fontFamily: "DM Sans, sans-serif", transitionDelay: "160ms" }}
              >
                Your body already knows how to heal.
                <br />
                We give it the frequency to remember.
              </p>

              <button
                onClick={handleBegin}
                className="journey-reveal btn-teal px-10 py-4 rounded-full text-lg font-semibold transition-transform active:scale-97"
                style={{ fontFamily: "DM Sans, sans-serif", boxShadow: "0 0 40px rgba(0,212,170,0.35)", transitionDelay: "240ms" }}
              >
                {isAuthenticated ? "Enter Reiki Healing →" : "Start Free →"}
              </button>

              <div className="journey-reveal mt-4 text-xs" style={{ color: "rgba(232,237,245,0.3)", fontFamily: "DM Sans, sans-serif", transitionDelay: "300ms" }}>
                No credit card required to start
              </div>

              {/* Quick links */}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {PROGRAMS.map(p => (
                  <button
                    key={p.href}
                    onClick={() => navigate(p.href)}
                    className="text-xs px-4 py-1.5 rounded-full transition-opacity hover:opacity-100"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(232,237,245,0.5)",
                      fontFamily: "DM Sans, sans-serif",
                      opacity: 0.7,
                    }}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Scroll position dots */}
      <ScrollDots total={TOTAL} current={activeSection} />
    </Layout>
  );
}
