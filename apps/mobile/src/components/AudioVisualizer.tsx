/**
 * AudioVisualizer — Real-time audio visualization component.
 *
 * Renders either a waveform (time-domain) or frequency spectrum (FFT) display
 * using the shared AnalyserNode from the synth engine. Uses react-native-svg
 * for smooth path rendering and requestAnimationFrame for 60fps updates.
 *
 * Design: Bioluminescent teal glow on dark void, concentric ring aesthetic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { colors, spacing, radii } from "@rih/ui-tokens";
import { getAnalyserNode } from "@/lib/synth";

export type VisualizerMode = "waveform" | "spectrum";

interface AudioVisualizerProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Width of the visualizer */
  width?: number;
  /** Height of the visualizer */
  height?: number;
  /** Primary color for the visualization */
  color?: string;
  /** Initial visualization mode */
  mode?: VisualizerMode;
}

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 120;
const BAR_COUNT = 32; // Number of frequency bars in spectrum mode

export default function AudioVisualizer({
  isPlaying,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = colors.teal,
  mode: initialMode = "waveform",
}: AudioVisualizerProps) {
  const [mode, setMode] = useState<VisualizerMode>(initialMode);
  const [pathData, setPathData] = useState<string>("");
  const [barHeights, setBarHeights] = useState<number[]>(
    () => new Array(BAR_COUNT).fill(0)
  );
  const animFrameRef = useRef<number | null>(null);
  const timeDomainDataRef = useRef<Uint8Array | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);

  // Build waveform SVG path from time-domain data
  const buildWaveformPath = useCallback(
    (data: Uint8Array): string => {
      const sliceWidth = width / data.length;
      let d = "";
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0; // Normalize to 0–2 range
        const y = (v * height) / 2;
        const x = i * sliceWidth;
        if (i === 0) {
          d += `M ${x} ${y}`;
        } else {
          d += ` L ${x} ${y}`;
        }
      }
      return d;
    },
    [width, height]
  );

  // Build bar heights from frequency data
  const buildSpectrumBars = useCallback(
    (data: Uint8Array): number[] => {
      const bars: number[] = [];
      // Group frequency bins into BAR_COUNT bars (logarithmic-ish distribution)
      const binCount = data.length;
      for (let i = 0; i < BAR_COUNT; i++) {
        // Use a slightly exponential mapping to emphasize lower frequencies
        const startBin = Math.floor(
          Math.pow(i / BAR_COUNT, 1.5) * binCount
        );
        const endBin = Math.floor(
          Math.pow((i + 1) / BAR_COUNT, 1.5) * binCount
        );
        let sum = 0;
        const count = Math.max(1, endBin - startBin);
        for (let j = startBin; j < endBin && j < binCount; j++) {
          sum += data[j];
        }
        const avg = sum / count;
        // Normalize to 0–1 range and apply a slight curve for visual impact
        const normalized = Math.pow(avg / 255, 0.8);
        bars.push(normalized * (height - 8)); // Leave padding
      }
      return bars;
    },
    [height]
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      // Reset to flat line / empty bars when not playing
      const centerY = height / 2;
      setPathData(`M 0 ${centerY} L ${width} ${centerY}`);
      setBarHeights(new Array(BAR_COUNT).fill(0));
      return;
    }

    const animate = () => {
      const analyser = getAnalyserNode();
      if (!analyser) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      if (mode === "waveform") {
        // Allocate buffer on first use or if fftSize changed
        if (
          !timeDomainDataRef.current ||
          timeDomainDataRef.current.length !== analyser.fftSize
        ) {
          timeDomainDataRef.current = new Uint8Array(analyser.fftSize);
        }
        analyser.getByteTimeDomainData(timeDomainDataRef.current);
        setPathData(buildWaveformPath(timeDomainDataRef.current));
      } else {
        // Spectrum mode
        const binCount = analyser.frequencyBinCount;
        if (
          !frequencyDataRef.current ||
          frequencyDataRef.current.length !== binCount
        ) {
          frequencyDataRef.current = new Uint8Array(binCount);
        }
        analyser.getByteFrequencyData(frequencyDataRef.current);
        setBarHeights(buildSpectrumBars(frequencyDataRef.current));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, mode, width, height, buildWaveformPath, buildSpectrumBars]);

  const toggleMode = () => {
    setMode((m) => (m === "waveform" ? "spectrum" : "waveform"));
  };

  // Build spectrum bars SVG path
  const buildSpectrumPath = (): string => {
    if (barHeights.every((h) => h === 0)) return "";
    const barWidth = (width - (BAR_COUNT - 1) * 2) / BAR_COUNT;
    let d = "";
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = i * (barWidth + 2);
      const barH = Math.max(2, barHeights[i]);
      const y = height - barH;
      const r = Math.min(barWidth / 2, 3); // Corner radius
      // Rounded top rectangle
      d += `M ${x} ${height} `;
      d += `L ${x} ${y + r} `;
      d += `Q ${x} ${y} ${x + r} ${y} `;
      d += `L ${x + barWidth - r} ${y} `;
      d += `Q ${x + barWidth} ${y} ${x + barWidth} ${y + r} `;
      d += `L ${x + barWidth} ${height} Z `;
    }
    return d;
  };

  return (
    <View style={styles.container}>
      {/* Visualizer canvas */}
      <View style={[styles.canvas, { width, height }]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="vizGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.9" />
              <Stop offset="1" stopColor={color} stopOpacity="0.3" />
            </LinearGradient>
            <LinearGradient id="glowGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.15" />
              <Stop offset="1" stopColor={color} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>

          {/* Background glow effect */}
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#glowGradient)"
            rx={radii.md}
          />

          {mode === "waveform" ? (
            /* Waveform path */
            pathData ? (
              <Path
                d={pathData}
                stroke="url(#vizGradient)"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null
          ) : (
            /* Spectrum bars */
            <Path d={buildSpectrumPath()} fill="url(#vizGradient)" />
          )}
        </Svg>

        {/* Idle state overlay */}
        {!isPlaying && (
          <View style={styles.idleOverlay}>
            <Text style={styles.idleText}>
              {mode === "waveform" ? "〰 Waveform" : "▮▮▮ Spectrum"}
            </Text>
          </View>
        )}
      </View>

      {/* Mode toggle */}
      <TouchableOpacity
        style={styles.modeToggle}
        onPress={toggleMode}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.modeToggleText}>
          {mode === "waveform" ? "◊ Spectrum" : "∿ Waveform"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: spacing[3],
  },
  canvas: {
    borderRadius: radii.lg,
    backgroundColor: "rgba(0,212,170,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.12)",
    overflow: "hidden",
    position: "relative",
  },
  idleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  idleText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1,
  },
  modeToggle: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modeToggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});
