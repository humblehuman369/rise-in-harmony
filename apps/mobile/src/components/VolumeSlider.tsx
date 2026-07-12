/**
 * VolumeSlider — Enhanced volume control with visual feedback.
 *
 * Features:
 *   - Smooth slider with animated teal glow track
 *   - Real-time level indicator showing current dB approximation
 *   - Haptic feedback on min/max boundaries
 *   - Mute toggle button
 *   - Integrates with the synth engine's master gain for global control
 */
import { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import { colors, spacing, radii, fontSizes } from "@rih/ui-tokens";

interface VolumeSliderProps {
  /** Current volume 0–1 */
  value: number;
  /** Called when volume changes */
  onValueChange: (value: number) => void;
  /** Primary accent color */
  color?: string;
  /** Whether to show the dB label */
  showLevel?: boolean;
  /** Label text (e.g., "Volume", "Master") */
  label?: string;
}

/** Convert linear volume (0–1) to approximate dB for display */
function volumeToDb(v: number): string {
  if (v <= 0) return "-∞";
  const db = 20 * Math.log10(v);
  return db.toFixed(0);
}

export default function VolumeSlider({
  value,
  onValueChange,
  color = colors.teal,
  showLevel = true,
  label,
}: VolumeSliderProps) {
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(value);
  const lastHapticRef = useRef<"min" | "max" | null>(null);

  const handleValueChange = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));

      // Haptic feedback at boundaries
      if (clamped <= 0 && lastHapticRef.current !== "min") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        lastHapticRef.current = "min";
      } else if (clamped >= 1 && lastHapticRef.current !== "max") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        lastHapticRef.current = "max";
      } else if (clamped > 0 && clamped < 1) {
        lastHapticRef.current = null;
      }

      if (isMuted && clamped > 0) {
        setIsMuted(false);
      }
      onValueChange(clamped);
    },
    [onValueChange, isMuted]
  );

  const toggleMute = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isMuted) {
      // Unmute: restore previous volume
      setIsMuted(false);
      onValueChange(previousVolumeRef.current || 0.7);
    } else {
      // Mute: save current volume and set to 0
      previousVolumeRef.current = value;
      setIsMuted(true);
      onValueChange(0);
    }
  }, [isMuted, value, onValueChange]);

  const displayVolume = isMuted ? 0 : value;
  const percentage = Math.round(displayVolume * 100);

  return (
    <View style={styles.container}>
      {/* Header row: label + level indicator */}
      {(label || showLevel) && (
        <View style={styles.headerRow}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showLevel && (
            <Text style={[styles.levelText, { color }]}>
              {percentage}% ({volumeToDb(displayVolume)} dB)
            </Text>
          )}
        </View>
      )}

      {/* Slider row: mute button + slider + percentage */}
      <View style={styles.sliderRow}>
        {/* Mute toggle */}
        <TouchableOpacity
          style={[
            styles.muteBtn,
            isMuted && styles.muteBtnActive,
          ]}
          onPress={toggleMute}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.muteIcon}>
            {isMuted || displayVolume === 0
              ? "🔇"
              : displayVolume < 0.3
              ? "🔈"
              : displayVolume < 0.7
              ? "🔉"
              : "🔊"}
          </Text>
        </TouchableOpacity>

        {/* Slider */}
        <View style={styles.sliderWrapper}>
          {/* Glow track background */}
          <View
            style={[
              styles.glowTrack,
              {
                width: `${percentage}%`,
                backgroundColor: `${color}15`,
                borderColor: `${color}30`,
              },
            ]}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.01}
            value={displayVolume}
            onValueChange={handleValueChange}
            minimumTrackTintColor={isMuted ? colors.textMuted : color}
            maximumTrackTintColor="rgba(255,255,255,0.08)"
            thumbTintColor={isMuted ? colors.textMuted : color}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[2],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[1],
    paddingHorizontal: spacing[1],
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  levelText: {
    fontSize: fontSizes.xs,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  muteBtnActive: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  muteIcon: {
    fontSize: 16,
  },
  sliderWrapper: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  glowTrack: {
    position: "absolute",
    left: 0,
    top: "25%",
    height: "50%",
    borderRadius: radii.full,
    borderWidth: 1,
  },
  slider: {
    flex: 1,
    height: 40,
  },
});
