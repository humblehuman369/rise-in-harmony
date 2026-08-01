import { useEffect, useRef } from "react";

/**
 * BioluminescentBackground
 * Large photorealistic-style SVG jellyfish + canvas particle field.
 * Jellyfish are 120–280px radius (matching App Store screenshot aesthetic).
 * Pointer-events: none — never blocks interaction.
 */

interface Props {
  variant?: "teal" | "purple" | "amber" | "mixed";
  density?: "low" | "medium" | "high";
}

const PALETTE = {
  teal:   { primary: "#00D4AA", secondary: "#00A882", glow: "rgba(0,212,170,", bg: "rgba(0,212,170,0.04)" },
  purple: { primary: "#8B5CF6", secondary: "#6D28D9", glow: "rgba(139,92,246,", bg: "rgba(139,92,246,0.04)" },
  amber:  { primary: "#F59E0B", secondary: "#D97706", glow: "rgba(245,158,11,", bg: "rgba(245,158,11,0.04)" },
  mixed:  { primary: "#00D4AA", secondary: "#8B5CF6", glow: "rgba(0,212,170,", bg: "rgba(0,212,170,0.04)" },
};

// Each jellyfish has its own color so we can mix teal + purple like the screenshots
const JELLY_COLORS = [
  "#00D4AA", "#00B8FF", "#8B5CF6", "#A855F7", "#00D4AA", "#6EE7FF", "#C084FC",
];

function buildJellyfishSVG(color: string, size: number, opacity: number): string {
  const r = size;
  const cx = size;
  const cy = size * 0.85;

  // Build tentacles — many thin wavy lines
  const tentacleCount = 14;
  const tentacles = Array.from({ length: tentacleCount }, (_, i) => {
    const spread = 1.6; // wider spread
    const angle = (i / (tentacleCount - 1)) * Math.PI * spread - (Math.PI * spread) / 2;
    const startX = cx + Math.sin(angle) * r * 0.72;
    const startY = cy + r * 0.55;
    const len = r * (0.9 + Math.random() * 1.4);
    const endX = startX + Math.sin(angle * 0.3) * r * 0.4 + (Math.random() - 0.5) * r * 0.3;
    const endY = startY + len;
    const cx1 = startX + (Math.random() - 0.5) * r * 0.5;
    const cy1 = startY + len * 0.35;
    const cx2 = endX + (Math.random() - 0.5) * r * 0.4;
    const cy2 = startY + len * 0.7;
    const strokeW = 0.5 + Math.random() * 0.8;
    return `<path d="M${startX},${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}"
      stroke="${color}" stroke-width="${strokeW}" fill="none" opacity="${opacity * (0.3 + Math.random() * 0.4)}"/>`;
  }).join("");

  // Inner oral arms (shorter, thicker)
  const oralArms = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 1.2 - Math.PI * 0.6;
    const startX = cx + Math.sin(angle) * r * 0.35;
    const startY = cy + r * 0.45;
    const len = r * (0.5 + Math.random() * 0.5);
    const endX = startX + Math.sin(angle) * r * 0.2 + (Math.random() - 0.5) * r * 0.2;
    const endY = startY + len;
    return `<path d="M${startX},${startY} Q${(startX + endX) / 2 + (Math.random() - 0.5) * r * 0.3},${(startY + endY) / 2} ${endX},${endY}"
      stroke="${color}" stroke-width="${1 + Math.random()}" fill="none" opacity="${opacity * 0.5}"/>`;
  }).join("");

  const svgH = size * 4.5;
  const svgW = size * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
    <defs>
      <radialGradient id="bell_${size}" cx="50%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${opacity * 0.95}"/>
        <stop offset="35%" stop-color="${color}" stop-opacity="${opacity * 0.55}"/>
        <stop offset="70%" stop-color="${color}" stop-opacity="${opacity * 0.15}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="inner_${size}" cx="50%" cy="30%" r="55%">
        <stop offset="0%" stop-color="white" stop-opacity="${opacity * 0.35}"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </radialGradient>
      <filter id="glow_${size}" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="${size * 0.08}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="softglow_${size}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="${size * 0.18}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Outer ambient glow halo -->
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.1}" ry="${r * 0.85}"
      fill="${color}" opacity="${opacity * 0.08}" filter="url(#softglow_${size})"/>

    <!-- Bell body -->
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.92}" ry="${r * 0.72}"
      fill="url(#bell_${size})" filter="url(#glow_${size})"/>

    <!-- Inner highlight dome -->
    <ellipse cx="${cx}" cy="${cy * 0.72}" rx="${r * 0.52}" ry="${r * 0.38}"
      fill="url(#inner_${size})"/>

    <!-- Sub-bell ridge -->
    <ellipse cx="${cx}" cy="${cy + r * 0.55}" rx="${r * 0.88}" ry="${r * 0.14}"
      fill="${color}" opacity="${opacity * 0.28}"/>

    <!-- Rim glow ring -->
    <ellipse cx="${cx}" cy="${cy + r * 0.6}" rx="${r * 0.92}" ry="${r * 0.1}"
      fill="none" stroke="${color}" stroke-width="1.5" opacity="${opacity * 0.5}"/>

    <!-- Tentacles -->
    ${tentacles}

    <!-- Oral arms -->
    ${oralArms}
  </svg>`;
}

interface Jelly {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  swayOffset: number;
  bobSpeed: number;
  bobOffset: number;
  color: string;
  svgUrl: string;
  el: HTMLImageElement | null;
}

const JELLY_SIZES = {
  low:    { count: 4, minSize: 80,  maxSize: 180 },
  medium: { count: 6, minSize: 100, maxSize: 240 },
  high:   { count: 9, minSize: 80,  maxSize: 280 },
};

export default function BioluminescentBackground({ variant = "teal", density = "medium" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const startRef     = useRef<number>(0);

  const pal = PALETTE[variant];
  const { count, minSize, maxSize } = JELLY_SIZES[density];

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // ── Canvas particle field ──────────────────────────────────────────────
    const ctx = canvas.getContext("2d")!;
    canvas.width  = W();
    canvas.height = H();

    interface Particle { x: number; y: number; r: number; speed: number; opacity: number; drift: number; colorIdx: number; }
    const pCount = density === "low" ? 35 : density === "medium" ? 65 : 110;
    const particles: Particle[] = Array.from({ length: pCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: 0.5 + Math.random() * 1.8,
      speed: 0.08 + Math.random() * 0.25,
      opacity: 0.08 + Math.random() * 0.35,
      drift: (Math.random() - 0.5) * 0.12,
      colorIdx: Math.floor(Math.random() * 3),
    }));

    const particleColors = [pal.glow, "rgba(139,92,246,", "rgba(0,184,255,"];

    function drawParticles(t: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(t * 0.0004 + p.y * 0.008) * 0.18;
        if (p.y < -10) { p.y = H() + 10; p.x = Math.random() * W(); }
        if (p.x < -10) p.x = W() + 10;
        if (p.x > W() + 10) p.x = -10;
        const pulse = 0.65 + 0.35 * Math.sin(t * 0.0008 + p.x * 0.008);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${particleColors[p.colorIdx]}${p.opacity * pulse})`;
        ctx.fill();
      }
    }

    // ── Jellyfish ──────────────────────────────────────────────────────────
    container.querySelectorAll(".rih-jelly").forEach(el => el.remove());

    // Distribute jellyfish around the edges (left, right, corners) like the screenshots
    const positions = [
      { x: 2,  y: 5  },  // top-left
      { x: 78, y: 3  },  // top-right
      { x: 0,  y: 45 },  // mid-left
      { x: 80, y: 50 },  // mid-right
      { x: 5,  y: 78 },  // bottom-left
      { x: 75, y: 75 },  // bottom-right
      { x: 20, y: 15 },  // upper-center-left
      { x: 60, y: 20 },  // upper-center-right
      { x: 10, y: 60 },  // lower-left
    ];

    const jellies: Jelly[] = Array.from({ length: count }, (_, i) => {
      const size    = minSize + Math.random() * (maxSize - minSize);
      const opacity = 0.55 + Math.random() * 0.35;
      const color   = JELLY_COLORS[i % JELLY_COLORS.length];
      const svg     = buildJellyfishSVG(color, size, opacity);
      const blob    = new Blob([svg], { type: "image/svg+xml" });
      const url     = URL.createObjectURL(blob);
      const img     = new Image();
      img.src       = url;
      img.className = "rih-jelly";
      img.style.cssText = "position:absolute;pointer-events:none;will-change:transform;";
      container.appendChild(img);

      const pos = positions[i % positions.length];

      return {
        x: pos.x + (Math.random() - 0.5) * 8,
        y: pos.y + (Math.random() - 0.5) * 8,
        size,
        opacity,
        color,
        speed:      0.004 + Math.random() * 0.006,
        sway:       1.5 + Math.random() * 2.5,
        swaySpeed:  0.00025 + Math.random() * 0.0003,
        swayOffset: Math.random() * Math.PI * 2,
        bobSpeed:   0.0003 + Math.random() * 0.0002,
        bobOffset:  Math.random() * Math.PI * 2,
        svgUrl: url,
        el: img,
      };
    });

    // ── Animation loop ─────────────────────────────────────────────────────
    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const t = ts - startRef.current;

      drawParticles(t);

      const vw = W(), vh = H();
      for (const j of jellies) {
        j.y -= j.speed;
        if (j.y < -20) { j.y = 108; j.x = 2 + Math.random() * 88; }
        const swayX = j.sway * Math.sin(t * j.swaySpeed + j.swayOffset);
        const bobY  = j.sway * 0.35 * Math.sin(t * j.bobSpeed + j.bobOffset);
        const px = ((j.x + swayX) / 100) * vw;
        const py = ((j.y + bobY) / 100) * vh;
        if (j.el) {
          j.el.style.transform = `translate(${px - j.size}px, ${py - j.size}px)`;
          j.el.style.width     = `${j.size * 2}px`;
          j.el.style.height    = `${j.size * 4.5}px`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    const onResize = () => { canvas.width = W(); canvas.height = H(); };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      jellies.forEach(j => { URL.revokeObjectURL(j.svgUrl); j.el?.remove(); });
    };
  }, [variant, density]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Deep ambient radial glows — multiple layers */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 70% 55% at 10% 15%, rgba(0,212,170,0.09) 0%, transparent 65%),
          radial-gradient(ellipse 60% 50% at 90% 20%, rgba(139,92,246,0.08) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 15% 75%, rgba(0,184,255,0.06) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 85% 80%, rgba(139,92,246,0.07) 0%, transparent 65%),
          radial-gradient(ellipse 40% 35% at 50% 50%, rgba(0,212,170,0.03) 0%, transparent 70%)
        `,
      }} />
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
