/**
 * @rih/ui-tokens
 *
 * Design tokens shared across web (Tailwind CSS variables) and mobile
 * (React Native StyleSheet values). All values are platform-agnostic
 * primitives — strings and numbers only.
 *
 * Web: reference these via CSS custom properties in index.css
 * Mobile: import and use directly in StyleSheet.create()
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  teal: "#00D4AA",
  tealDim: "rgba(0,212,170,0.15)",
  tealBorder: "rgba(0,212,170,0.25)",
  purple: "#8B5CF6",
  purpleDim: "rgba(139,92,246,0.12)",
  amber: "#F59E0B",

  // Backgrounds (dark theme)
  bgDeep: "#0A0B14",
  bgSurface: "#0D0F1E",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.07)",
  bgBorder: "rgba(255,255,255,0.08)",

  // Text
  textPrimary: "#E8EDF5",
  textSecondary: "#8FA3BF",
  textMuted: "#6B7A99",
  textDim: "#4A5568",

  // Chakra colors
  chakraRoot: "#EF4444",       // 396Hz
  chakraSacral: "#F97316",     // 417Hz
  chakraSolar: "#00D4AA",      // 528Hz
  chakraHeart: "#22C55E",      // 639Hz
  chakraThroat: "#3B82F6",     // 741Hz
  chakraThirdEye: "#8B5CF6",   // 852Hz
  chakraCrown: "#A855F7",      // 963Hz

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fonts = {
  serif: "Cormorant Garamond, Georgia, serif",
  sans: "DM Sans, system-ui, sans-serif",
  mono: "JetBrains Mono, Fira Code, monospace",
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 36,
  "4xl": 48,
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

/** React Native shadow props (iOS + Android elevation) */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  teal: {
    shadowColor: "#00D4AA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ─── Animation Durations ──────────────────────────────────────────────────────

export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  xslow: 600,
} as const;

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;
