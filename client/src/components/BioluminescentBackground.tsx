import { useEffect, useRef } from "react";

/**
 * BioluminescentBackground
 * Renders floating SVG jellyfish + a canvas particle field as a fixed full-screen
 * background layer. Pointer-events: none so it never blocks interaction.
 *
 * Props:
 *   variant  – "teal" (default) | "purple" | "amber"
 *   density  – "low" | "medium" (default) | "high"
 */

interface Props {
  variant?: "teal" | "purple" | "amber";
  density?: "low" | "medium" | "high";
}

const PALETTE = {
  teal:   { primary: "#00D4AA", secondary: "#0A7A6A", glow: "rgba(0,212,170,", bg: "rgba(0,212,170,0.04)" },
  purple: { primary: "#8B5CF6", secondary: "#5B21B6", glow: "rgba(139,92,246,", bg: "rgba(139,92,246,0.04)" },
  amber:  { primary: "#F59E0B", secondary: "#B45309", glow: "rgba(245,158,11,", bg: "rgba(245,158,11,0.04)" },
};

const JELLYFISH_COUNT = { low: 3, medium: 5, high: 8 };

// ─── SVG jellyfish path builder ───────────────────────────────────────────────
function buildJellyfishSVG(color: string, size: number, opacity: number): string {
  const r = size / 2;
  const tentacleCount = 8;
  const tentacles = Array.from({ length: tentacleCount }, (_, i) => {
    const angle = (i / tentacleCount) * Math.PI; // spread across bottom half
    const startX = r + Math.cos(Math.PI + angle) * r * 0.7;
    const startY = r * 1.1;
    const endX = startX + (Math.random() - 0.5) * r * 0.8;
    const endY = startY + r * (0.8 + Math.random() * 0.8);
    const cx1 = startX + (Math.random() - 0.5) * r * 0.6;
    const cy1 = startY + r * 0.3;
    return `<path d="M${startX},${startY} Q${cx1},${cy1} ${endX},${endY}" stroke="${color}" stroke-width="1" fill="none" opacity="${opacity * 0.5}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 3}" viewBox="0 0 ${size * 2} ${size * 3}">
    <defs>
      <radialGradient id="jg" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${color}" stop-opacity="${opacity * 0.9}"/>
        <stop offset="60%" stop-color="${color}" stop-opacity="${opacity * 0.3}"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </radialGradient>
      <filter id="jf">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Bell -->
    <ellipse cx="${r}" cy="${r * 0.9}" rx="${r * 0.95}" ry="${r * 0.75}" fill="url(#jg)" filter="url(#jf)"/>
    <!-- Inner highlight -->
    <ellipse cx="${r}" cy="${r * 0.7}" rx="${r * 0.5}" ry="${r * 0.35}" fill="${color}" opacity="${opacity * 0.15}"/>
    <!-- Rim -->
    <ellipse cx="${r}" cy="${r * 1.05}" rx="${r * 0.95}" ry="${r * 0.18}" fill="${color}" opacity="${opacity * 0.25}"/>
    <!-- Tentacles -->
    ${tentacles}
  </svg>`;
}

// ─── Jellyfish instance ───────────────────────────────────────────────────────
interface Jelly {
  x: number;       // % of viewport width
  y: number;       // % of viewport height (can go below 100 to drift off-screen)
  size: number;    // px radius
  opacity: number;
  speed: number;   // px/s vertical drift
  sway: number;    // px horizontal sway amplitude
  swaySpeed: number;
  swayOffset: number;
  bobSpeed: number;
  bobOffset: number;
  svgUrl: string;
  el: HTMLImageElement | null;
}

export default function BioluminescentBackground({ variant = "teal", density = "medium" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jelliesRef = useRef<Jelly[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const pal = PALETTE[variant];
  const count = JELLYFISH_COUNT[density];

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // ── Canvas particle field ──────────────────────────────────────────────
    const ctx = canvas.getContext("2d")!;
    canvas.width = W();
    canvas.height = H();

    interface Particle {
      x: number; y: number; r: number; speed: number; opacity: number; drift: number;
    }
    const particleCount = density === "low" ? 30 : density === "medium" ? 55 : 90;
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      r: 0.5 + Math.random() * 1.5,
      speed: 0.1 + Math.random() * 0.3,
      opacity: 0.1 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.15,
    }));

    function drawParticles(t: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(t * 0.0005 + p.y * 0.01) * 0.2;
        if (p.y < -10) { p.y = H() + 10; p.x = Math.random() * W(); }
        if (p.x < -10) p.x = W() + 10;
        if (p.x > W() + 10) p.x = -10;
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.001 + p.x * 0.01);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${pal.glow}${p.opacity * pulse})`;
        ctx.fill();
      }
    }

    // ── Jellyfish ──────────────────────────────────────────────────────────
    // Remove old jellyfish elements
    container.querySelectorAll(".rih-jelly").forEach(el => el.remove());

    const jellies: Jelly[] = Array.from({ length: count }, (_, i) => {
      const size = 30 + Math.random() * 50;
      const opacity = 0.15 + Math.random() * 0.35;
      const svg = buildJellyfishSVG(pal.primary, size, opacity);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      img.className = "rih-jelly";
      img.style.cssText = `position:absolute;pointer-events:none;will-change:transform;`;
      container.appendChild(img);

      return {
        x: 5 + Math.random() * 90,
        y: 10 + Math.random() * 80,
        size,
        opacity,
        speed: 0.008 + Math.random() * 0.012,   // % viewport/s
        sway: 1 + Math.random() * 3,
        swaySpeed: 0.0003 + Math.random() * 0.0004,
        swayOffset: Math.random() * Math.PI * 2,
        bobSpeed: 0.0004 + Math.random() * 0.0003,
        bobOffset: Math.random() * Math.PI * 2,
        svgUrl: url,
        el: img,
      };
    });
    jelliesRef.current = jellies;

    // ── Animation loop ─────────────────────────────────────────────────────
    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const t = ts - startRef.current;

      drawParticles(t);

      const vw = W(), vh = H();
      for (const j of jellies) {
        j.y -= j.speed;
        if (j.y < -15) { j.y = 110; j.x = 5 + Math.random() * 90; }
        const swayX = j.sway * Math.sin(t * j.swaySpeed + j.swayOffset);
        const bobY  = j.sway * 0.4 * Math.sin(t * j.bobSpeed + j.bobOffset);
        const px = ((j.x + swayX) / 100) * vw;
        const py = ((j.y + bobY) / 100) * vh;
        if (j.el) {
          j.el.style.transform = `translate(${px - j.size}px, ${py - j.size}px)`;
          j.el.style.width = `${j.size * 2}px`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    // ── Resize handler ─────────────────────────────────────────────────────
    const onResize = () => {
      canvas.width = W();
      canvas.height = H();
    };
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
      {/* Ambient radial glows */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 30%, ${pal.glow}0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 35% at 80% 70%, ${pal.glow}0.05) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 50% 50%, ${pal.glow}0.03) 0%, transparent 70%)
          `,
        }}
      />
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
