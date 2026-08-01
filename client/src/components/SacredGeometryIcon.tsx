/**
 * SacredGeometryIcon
 * Inline SVG sacred geometry patterns for each Solfeggio frequency.
 * Renders as a glowing teal/color line-art icon.
 */

interface Props {
  hz: number;
  color: string;
  size?: number;
  opacity?: number;
}

// Each frequency maps to a distinct sacred geometry pattern
function getPattern(hz: number, color: string, size: number, opacity: number): JSX.Element {
  const s = size;
  const c = s / 2;
  const strokeProps = {
    stroke: color,
    strokeWidth: "0.8",
    fill: "none",
    opacity: opacity,
  };

  switch (hz) {
    case 174: // Metatron's Cube — Foundation
      return (
        <g {...strokeProps}>
          {/* Outer circle */}
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Inner hexagon */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60 - 90) * Math.PI / 180;
            const b = ((i + 1) * 60 - 90) * Math.PI / 180;
            return <line key={i} x1={c + Math.cos(a) * c * 0.6} y1={c + Math.sin(a) * c * 0.6}
              x2={c + Math.cos(b) * c * 0.6} y2={c + Math.sin(b) * c * 0.6} />;
          })}
          {/* Star lines */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60 - 90) * Math.PI / 180;
            return <line key={i} x1={c} y1={c} x2={c + Math.cos(a) * c * 0.9} y2={c + Math.sin(a) * c * 0.9} />;
          })}
          {/* Center dot */}
          <circle cx={c} cy={c} r={c * 0.08} fill={color} opacity={opacity} />
        </g>
      );

    case 285: // Flower of Life — Restoration
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* 6 petal circles */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <circle key={i} cx={c + Math.cos(a) * c * 0.45} cy={c + Math.sin(a) * c * 0.45} r={c * 0.45} />;
          })}
          <circle cx={c} cy={c} r={c * 0.45} />
        </g>
      );

    case 396: // Star Tetrahedron — Liberation
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Upward triangle */}
          <polygon points={`${c},${c - c * 0.75} ${c - c * 0.65},${c + c * 0.38} ${c + c * 0.65},${c + c * 0.38}`} />
          {/* Downward triangle */}
          <polygon points={`${c},${c + c * 0.75} ${c - c * 0.65},${c - c * 0.38} ${c + c * 0.65},${c - c * 0.38}`} />
        </g>
      );

    case 417: // Vesica Piscis — Change
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Overlapping circles */}
          <circle cx={c - c * 0.3} cy={c} r={c * 0.6} />
          <circle cx={c + c * 0.3} cy={c} r={c * 0.6} />
          {/* Inner petal lines */}
          <line x1={c} y1={c - c * 0.52} x2={c} y2={c + c * 0.52} />
        </g>
      );

    case 432: // Seed of Life — Natural Harmony
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* 6 circles in ring */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <circle key={i} cx={c + Math.cos(a) * c * 0.42} cy={c + Math.sin(a) * c * 0.42} r={c * 0.42} />;
          })}
          <circle cx={c} cy={c} r={c * 0.42} />
        </g>
      );

    case 528: // Flower of Life (Heart) — Love Frequency
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Flower of Life with heart center */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <circle key={i} cx={c + Math.cos(a) * c * 0.45} cy={c + Math.sin(a) * c * 0.45} r={c * 0.45} />;
          })}
          <circle cx={c} cy={c} r={c * 0.45} />
          {/* Inner ring */}
          <circle cx={c} cy={c} r={c * 0.22} />
        </g>
      );

    case 639: // Sri Yantra — Connection
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Nested triangles */}
          {[0.75, 0.55, 0.38].map((r, i) => (
            <polygon key={i} points={`${c},${c - c * r} ${c - c * r * 0.87},${c + c * r * 0.5} ${c + c * r * 0.87},${c + c * r * 0.5}`} />
          ))}
          {[0.65, 0.48].map((r, i) => (
            <polygon key={i} points={`${c},${c + c * r} ${c - c * r * 0.87},${c - c * r * 0.5} ${c + c * r * 0.87},${c - c * r * 0.5}`} />
          ))}
          <circle cx={c} cy={c} r={c * 0.12} fill={color} opacity={opacity * 0.5} />
        </g>
      );

    case 741: // Star of David — Awakening
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* Hexagram */}
          <polygon points={`${c},${c - c * 0.72} ${c - c * 0.62},${c + c * 0.36} ${c + c * 0.62},${c + c * 0.36}`} />
          <polygon points={`${c},${c + c * 0.72} ${c - c * 0.62},${c - c * 0.36} ${c + c * 0.62},${c - c * 0.36}`} />
          <circle cx={c} cy={c} r={c * 0.18} />
        </g>
      );

    case 852: // Metatron's Cube full — Intuition
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* 13-circle Metatron's Cube */}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <circle key={i} cx={c + Math.cos(a) * c * 0.45} cy={c + Math.sin(a) * c * 0.45} r={c * 0.45} />;
          })}
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <circle key={i + 6} cx={c + Math.cos(a) * c * 0.9} cy={c + Math.sin(a) * c * 0.9} r={c * 0.45} />;
          })}
          <circle cx={c} cy={c} r={c * 0.45} />
        </g>
      );

    case 963: // Crown — Cosmic geometry
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {/* 12-pointed star */}
          {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
            const a = (i * 30 - 90) * Math.PI / 180;
            const b = ((i + 0.5) * 30 - 90) * Math.PI / 180;
            return (
              <g key={i}>
                <line x1={c + Math.cos(a) * c * 0.5} y1={c + Math.sin(a) * c * 0.5}
                  x2={c + Math.cos(a) * c * 0.88} y2={c + Math.sin(a) * c * 0.88} />
                <line x1={c + Math.cos(b) * c * 0.3} y1={c + Math.sin(b) * c * 0.3}
                  x2={c + Math.cos(b) * c * 0.65} y2={c + Math.sin(b) * c * 0.65} />
              </g>
            );
          })}
          <circle cx={c} cy={c} r={c * 0.28} />
          <circle cx={c} cy={c} r={c * 0.1} fill={color} opacity={opacity} />
        </g>
      );

    default: // Generic sacred circle
      return (
        <g {...strokeProps}>
          <circle cx={c} cy={c} r={c * 0.9} />
          {[0,1,2,3,4,5].map(i => {
            const a = (i * 60) * Math.PI / 180;
            return <line key={i} x1={c} y1={c} x2={c + Math.cos(a) * c * 0.9} y2={c + Math.sin(a) * c * 0.9} />;
          })}
          <circle cx={c} cy={c} r={c * 0.45} />
        </g>
      );
  }
}

export default function SacredGeometryIcon({ hz, color, size = 44, opacity = 0.7 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        filter: `drop-shadow(0 0 ${size * 0.15}px ${color}) drop-shadow(0 0 ${size * 0.3}px ${color}60)`,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {getPattern(hz, color, size, opacity)}
    </svg>
  );
}
