/**
 * AlarmRingingScreen — Full-screen wake experience for Rise In Harmony (mobile)
 *
 * This component renders as a full-screen modal overlay when an alarm fires.
 * It uses the react-native-audio-api DDS engine (via createVoice) for sustained,
 * precision-tuned healing frequency playback — NOT a one-shot notification sound.
 *
 * Key features:
 *   - 4-stage progressive volume escalation: Whisper → Rise → Full → Persistent
 *   - Sleep Profile controls escalation speed (light / normal / heavy / very_heavy)
 *   - Persistent stage holds at 100% volume indefinitely until dismissed
 *   - expo-keep-awake prevents screen from sleeping during alarm
 *   - expo-haptics provides escalating vibration feedback at each stage
 *   - Snooze up to 2 times (5 min each); 3rd snooze switches to grounding 174Hz
 *   - Dismiss requires completing a short morning mission (breathing / gratitude)
 *
 * Volume escalation stages (fractions of fadeInMinutes):
 *   Stage 0 (Whisper):    5% → 22%  — barely audible, subconscious priming
 *   Stage 1 (Rise):      22% → 65%  — clearly audible, gentle awakening
 *   Stage 2 (Full):      65% → 100% — full healing resonance
 *   Stage 3 (Persistent): 100%      — maximum volume, held indefinitely
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as KeepAwake from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { createVoice, setMasterVolume } from "@/lib/synth";
import type { SynthVoice } from "@/lib/synth";
import { FREQUENCIES, MEDITATIONS } from "@rih/shared-utils";
import type { Alarm } from "@rih/shared-types";

// ─── CDN URLs for meditation tracks (same as useMeditationPlayer.ts) ─────────
const MEDITATION_CDN_URLS: Record<string, string> = {
  "calm-sleep-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/IYQghxoiyPtmxTWZ.mp3",
  "deep-serenity-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/XrswIdGeuQpsHQZo.mp3",
  "nature-meditation-174": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ySLrOnBvjVJpOcpp.mp3",
  "reiki-healing-garden-285": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/JMfdCoiZFkPyxCYD.mp3",
  "spiritual-meditation-444": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/GtKAQCHgteBuniTF.mp3",
  "third-eye-activation-528": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/fsamjpcaHNeOwiPp.mp3",
  "deep-into-nature-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/WKmRGyioQaoQKeeJ.mp3",
  "inner-calling-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ktyVgoowVIAMSvwT.mp3",
  "peaceful-ocean-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/gjiHzXouliJdAAeH.mp3",
};

// ─── Bundled nature sound assets ──────────────────────────────────────────────
const NATURE_ASSETS: Record<string, number> = {
  "ambient-rain": require("../../assets/sounds/ambient-rain.mp3"),
  "ambient-ocean": require("../../assets/sounds/ambient-ocean.mp3"),
  "ambient-forest": require("../../assets/sounds/ambient-forest.mp3"),
  "ambient-wind": require("../../assets/sounds/ambient-wind.mp3"),
  "ambient-fire": require("../../assets/sounds/ambient-fire.mp3"),
};

// ─── Sleep profile stage fractions ────────────────────────────────────────────
// Each value is the fraction of fadeInMinutes at which that stage boundary occurs.
// After stage3, Persistent runs indefinitely at 100% volume.
const STAGE_FRACTIONS: Record<string, [number, number, number]> = {
  light:     [0.25, 0.55, 0.80],
  normal:    [0.20, 0.50, 0.80],
  heavy:     [0.12, 0.35, 0.65],
  "very-heavy": [0.08, 0.25, 0.50],
};

// ─── Stage volume targets ──────────────────────────────────────────────────────
const STAGE_VOLUMES = [0.05, 0.22, 0.65, 1.0] as const;

// ─── Haptic patterns per stage ────────────────────────────────────────────────
const STAGE_HAPTICS = [
  null,                                           // Stage 0: no haptics
  [0, 200, 800],                                  // Stage 1: gentle single pulse
  [0, 300, 500, 300, 500],                        // Stage 2: double pulse
  [0, 400, 300, 400, 300, 400, 300, 400],         // Stage 3: persistent pattern
];

// ─── Colors ───────────────────────────────────────────────────────────────────
const TEAL = "#00D4AA";
const AMBER = "#F59E0B";
const PURPLE = "#8B5CF6";
const BG = "#0A0B14";

const { width: SCREEN_W } = Dimensions.get("window");

interface AlarmRingingScreenProps {
  alarm: Alarm;
  sleepProfile?: string;
  snoozeCount?: number;
  maxSnoozes?: number;
  onStop: () => void;
  onSnooze: () => void;
}

/** Determine the sound display name for the alarm */
function getSoundDisplayName(alarm: Alarm): string {
  if ((alarm as Record<string, unknown>).meditationLabel) {
    return (alarm as Record<string, unknown>).meditationLabel as string;
  }
  if ((alarm as Record<string, unknown>).ambientLabel) {
    return (alarm as Record<string, unknown>).ambientLabel as string;
  }
  return `${alarm.frequencyHz}Hz — ${alarm.frequencyName ?? "Healing Frequency"}`;
}

type MissionType = "breathing" | "gratitude";

// ─── Breathing Mission ────────────────────────────────────────────────────────
function BreathingMission({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "done">("inhale");
  const [countdown, setCountdown] = useState(4);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleRef = useRef(0);

  const PHASES = [
    { phase: "inhale" as const, duration: 4, label: "Inhale", color: TEAL },
    { phase: "hold" as const, duration: 7, label: "Hold", color: PURPLE },
    { phase: "exhale" as const, duration: 8, label: "Exhale", color: AMBER },
  ];

  useEffect(() => {
    if (phase === "done") return;
    const current = PHASES.find(p => p.phase === phase)!;
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else {
      const idx = PHASES.findIndex(p => p.phase === phase);
      const next = PHASES[idx + 1];
      if (next) {
        setPhase(next.phase);
        setCountdown(next.duration);
      } else {
        cycleRef.current += 1;
        if (cycleRef.current >= 1) {
          setPhase("done");
          setTimeout(onComplete, 800);
        } else {
          setPhase("inhale");
          setCountdown(4);
        }
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, countdown]);

  if (phase === "done") {
    return (
      <View style={styles.missionDone}>
        <Text style={styles.missionDoneIcon}>✓</Text>
        <Text style={[styles.missionDoneText, { color: TEAL }]}>Beautifully done</Text>
      </View>
    );
  }

  const current = PHASES.find(p => p.phase === phase)!;

  return (
    <View style={styles.breathingContainer}>
      <View style={[styles.breathingCircle, { borderColor: current.color }]}>
        <Text style={[styles.breathingCountdown, { color: current.color }]}>{countdown}</Text>
        <Text style={styles.breathingUnit}>sec</Text>
      </View>
      <Text style={[styles.breathingPhase, { color: current.color }]}>{current.label}</Text>
      <Text style={styles.breathingHint}>
        {phase === "inhale" && "Breathe in slowly through your nose"}
        {phase === "hold" && "Hold gently — feel the stillness"}
        {phase === "exhale" && "Release fully through your mouth"}
      </Text>
    </View>
  );
}

// ─── Gratitude Mission ────────────────────────────────────────────────────────
function GratitudeMission({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const PROMPTS = [
    "What is one thing you're grateful for today?",
    "Name one person who makes your life brighter.",
    "What small joy are you looking forward to today?",
    "What strength in yourself are you grateful for?",
  ];
  const prompt = PROMPTS[new Date().getDay() % PROMPTS.length];

  const handleSubmit = () => {
    if (text.trim().length < 2) return;
    setSubmitted(true);
    setTimeout(onComplete, 1200);
  };

  if (submitted) {
    return (
      <View style={styles.missionDone}>
        <Text style={styles.missionDoneIcon}>🌅</Text>
        <Text style={[styles.missionDoneText, { color: AMBER }]}>Beautiful intention set</Text>
        <Text style={styles.gratitudeQuote}>"{text}"</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.gratitudePrompt}>{prompt}</Text>
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        placeholder="Type your answer…"
        placeholderTextColor="#4A5568"
        style={styles.gratitudeInput}
        multiline
        onSubmitEditing={handleSubmit}
      />
      <TouchableOpacity
        style={[styles.gratitudeBtn, { opacity: text.trim().length >= 2 ? 1 : 0.4 }]}
        onPress={handleSubmit}
        disabled={text.trim().length < 2}
      >
        <Text style={styles.gratitudeBtnText}>Set My Intention</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

// ─── Main AlarmRingingScreen ──────────────────────────────────────────────────
export default function AlarmRingingScreen({
  alarm,
  sleepProfile = "normal",
  snoozeCount = 0,
  maxSnoozes = 2,
  onStop,
  onSnooze,
}: AlarmRingingScreenProps) {
  const voiceRef = useRef<SynthVoice | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);

  // Determine sound type from alarm
  const alarmExt = alarm as Record<string, unknown>;
  const soundType: string = (alarmExt.soundType as string) ?? "frequency";
  const ambientId: string | null = (alarmExt.ambientId as string) ?? null;
  const meditationId: string | null = (alarmExt.meditationId as string) ?? null;

  const [stage, setStage] = useState(0);
  const [volumePct, setVolumePct] = useState(0);
  const [showMission, setShowMission] = useState(false);
  const [missionType] = useState<MissionType>(snoozeCount % 2 === 0 ? "breathing" : "gratitude");
  const [missionComplete, setMissionComplete] = useState(false);

  // Pulse animation for the alarm icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Start audio and volume escalation ──────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Keep screen awake
    KeepAwake.activateKeepAwakeAsync().catch(() => {});

    // Compute stage boundaries in ms
    const fadeMs = Math.max(alarm.fadeInMinutes ?? 5, 1) * 60 * 1000;
    const fracs = STAGE_FRACTIONS[sleepProfile] ?? STAGE_FRACTIONS.normal;
    const stage1Ms = fracs[0] * fadeMs;
    const stage2Ms = fracs[1] * fadeMs;
    const stage3Ms = fracs[2] * fadeMs;

    // Configure audio mode for background + silent mode playback
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    if (soundType === "ambient" && ambientId && NATURE_ASSETS[ambientId]) {
      // Play bundled nature sound via expo-audio
      const player = createAudioPlayer(NATURE_ASSETS[ambientId]);
      player.loop = true;
      player.volume = STAGE_VOLUMES[0];
      player.play();
      audioPlayerRef.current = player;
    } else if (soundType === "meditation" && meditationId && MEDITATION_CDN_URLS[meditationId]) {
      // Play CDN meditation track via expo-audio
      const player = createAudioPlayer({ uri: MEDITATION_CDN_URLS[meditationId] });
      player.loop = true;
      player.volume = STAGE_VOLUMES[0];
      player.play();
      audioPlayerRef.current = player;
    } else {
      // Default: DDS frequency synthesis
      const freq = FREQUENCIES.find(f => f.hz === alarm.frequencyHz) ?? FREQUENCIES.find(f => f.hz === 432) ?? FREQUENCIES[0];
      const voice = createVoice({
        hz: freq.hz,
        waveform: "sine",
        volume: STAGE_VOLUMES[0],
      });
      voice.start(2.0); // 2-second fade-in to avoid jarring start
      voiceRef.current = voice;
    }

    const startedAt = Date.now();

    // Volume escalation tick — runs every 500ms
    fadeTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;

      let currentStage = 3; // Persistent — default once past stage3Ms
      if (elapsed < stage1Ms) currentStage = 0;
      else if (elapsed < stage2Ms) currentStage = 1;
      else if (elapsed < stage3Ms) currentStage = 2;

      setStage(prev => {
        // Trigger haptics on stage transition
        if (currentStage > prev) {
          const pattern = STAGE_HAPTICS[currentStage];
          if (pattern) {
            Vibration.vibrate(pattern);
          }
          if (currentStage === 3) {
            // Persistent stage: strong haptic notification
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
        }
        return currentStage;
      });

      // Compute target volume
      let level: number;
      if (currentStage === 0) {
        const t = elapsed / stage1Ms;
        level = STAGE_VOLUMES[0] + (STAGE_VOLUMES[1] - STAGE_VOLUMES[0]) * Math.min(1, t);
      } else if (currentStage === 1) {
        const t = (elapsed - stage1Ms) / (stage2Ms - stage1Ms);
        level = STAGE_VOLUMES[1] + (STAGE_VOLUMES[2] - STAGE_VOLUMES[1]) * Math.min(1, t);
      } else if (currentStage === 2) {
        const t = (elapsed - stage2Ms) / (stage3Ms - stage2Ms);
        level = STAGE_VOLUMES[2] + (STAGE_VOLUMES[3] - STAGE_VOLUMES[2]) * Math.min(1, t);
      } else {
        // Persistent: hold at maximum volume indefinitely
        // Subtle pulse between 0.92 and 1.0 to prevent audio normalisation
        const pulseT = (elapsed / 2000) % 1;
        level = 0.92 + 0.08 * Math.abs(Math.sin(pulseT * Math.PI));
      }

      level = Math.max(0.02, Math.min(1.0, level));
      setVolumePct(Math.round(level * 100));

      // Apply volume to whichever player is active
      if (audioPlayerRef.current) {
        audioPlayerRef.current.volume = level;
      } else {
        voiceRef.current?.setVolume(level, 0.4);
      }
    }, 500);

    // Persistent stage haptic loop — vibrate every 30s in persistent stage
    hapticTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= stage3Ms) {
        Vibration.vibrate([0, 500, 300, 500]);
      }
    }, 30_000);

    return () => {
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      if (hapticTimerRef.current) clearInterval(hapticTimerRef.current);
      voiceRef.current?.stop(0.5);
      voiceRef.current = null;
      if (audioPlayerRef.current) {
        try { audioPlayerRef.current.pause(); } catch { /* ignore */ }
        audioPlayerRef.current = null;
      }
      KeepAwake.deactivateKeepAwake().catch(() => {});
      Vibration.cancel();
    };
  }, []);

  const handleStopPress = useCallback(() => {
    if (!missionComplete) {
      setShowMission(true);
    } else {
      onStop();
    }
  }, [missionComplete, onStop]);

  const handleMissionComplete = useCallback(() => {
    setMissionComplete(true);
    setShowMission(false);
    setTimeout(onStop, 600);
  }, [onStop]);

  const STAGE_LABELS = ["Whispering…", "Rising gently…", "Full resonance", "Wake up — it's time"];
  const STAGE_COLORS = ["#4A5568", TEAL, TEAL, AMBER];
  const stageColor = STAGE_COLORS[stage];
  const snoozesLeft = maxSnoozes - snoozeCount;
  const soundDisplayName = getSoundDisplayName(alarm);

  return (
    <View style={styles.container}>
      {/* Background gradient rings */}
      {[1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.ring,
            {
              width: 120 + i * 100,
              height: 120 + i * 100,
              borderColor: stage >= 3
                ? `rgba(245,158,11,${0.12 - i * 0.03})`
                : `rgba(0,212,170,${0.12 - i * 0.03})`,
            },
          ]}
        />
      ))}

      <SafeAreaView style={styles.safeArea}>

        {/* Mission overlay */}
        {showMission && (
          <View style={styles.missionOverlay}>
            <View style={styles.missionCard}>
              <View style={styles.missionBadge}>
                <Text style={styles.missionBadgeText}>Complete to dismiss</Text>
              </View>
              <Text style={styles.missionTitle}>Morning Ritual</Text>

              {missionType === "breathing" && (
                <BreathingMission onComplete={handleMissionComplete} />
              )}
              {missionType === "gratitude" && (
                <GratitudeMission onComplete={handleMissionComplete} />
              )}

              <TouchableOpacity style={styles.backBtn} onPress={() => setShowMission(false)}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main content */}
        <View style={styles.content}>

          {/* Stage dots */}
          <View style={styles.stageDots}>
            {["Whisper", "Rise", "Full", "Persistent"].map((name, i) => (
              <View key={i} style={styles.stageDotRow}>
                <View style={[
                  styles.stageDot,
                  {
                    width: i === stage ? 24 : 6,
                    backgroundColor: i <= stage ? STAGE_COLORS[i] : "rgba(255,255,255,0.1)",
                  },
                ]} />
                {i < 3 && <View style={styles.stageDotConnector} />}
              </View>
            ))}
          </View>

          {/* Alarm icon */}
          <Animated.Text
            style={[styles.alarmIcon, { transform: [{ scale: pulseAnim }], color: stageColor }]}
          >
            ⏰
          </Animated.Text>

          {/* Label */}
          <Text style={styles.alarmLabel}>{alarm.label ?? "Healing Alarm"}</Text>

          {/* Sound name */}
          <Text style={[styles.alarmFreq, { color: stageColor }]}>
            {soundDisplayName}
          </Text>

          {/* Stage status */}
          <Text style={[styles.stageLabel, { color: stageColor }]}>
            {STAGE_LABELS[stage]}
          </Text>

          {/* Volume bar */}
          <View style={styles.volumeContainer}>
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <Text style={[styles.volumePct, { color: stageColor }]}>{volumePct}%</Text>
            </View>
            <View style={styles.volumeTrack}>
              <View style={[
                styles.volumeFill,
                {
                  width: `${volumePct}%` as `${number}%`,
                  backgroundColor: stageColor,
                  shadowColor: stageColor,
                },
              ]} />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            {snoozesLeft > 0 && (
              <TouchableOpacity style={styles.snoozeBtn} onPress={onSnooze} activeOpacity={0.8}>
                <Text style={styles.snoozeBtnText}>
                  🌙 Snooze 5 min{snoozesLeft < maxSnoozes ? ` (${snoozesLeft} left)` : ""}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.stopBtn} onPress={handleStopPress} activeOpacity={0.8}>
              <Text style={styles.stopBtnText}>
                {!missionComplete ? "I'm awake →" : "✓ Dismiss"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mission hint */}
          {!missionComplete && (
            <Text style={styles.missionHint}>
              A short morning ritual awaits when you dismiss
            </Text>
          )}

          {/* Snooze escalation */}
          {snoozeCount >= 1 && (
            <View style={styles.escalationBadge}>
              <Text style={styles.escalationText}>
                {snoozeCount === 1
                  ? "Frequency shifted to 174Hz for gentle re-entry"
                  : "⚡ Full volume — time to rise in harmony"}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
  },
  safeArea: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stageDots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  stageDotRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stageDot: {
    height: 6,
    borderRadius: 3,
  },
  stageDotConnector: {
    width: 12,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 2,
  },
  alarmIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  alarmLabel: {
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 32,
    color: "#E8EDF5",
    textAlign: "center",
    marginBottom: 8,
  },
  alarmFreq: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
  },
  stageLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 24,
    textAlign: "center",
  },
  volumeContainer: {
    width: 200,
    marginBottom: 40,
  },
  volumeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  volumeLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "#4A5568",
  },
  volumePct: {
    fontFamily: "DMSans_500Medium",
    fontSize: 10,
  },
  volumeTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  volumeFill: {
    height: "100%",
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  snoozeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },
  snoozeBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#C084FC",
  },
  stopBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,212,170,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.4)",
  },
  stopBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: TEAL,
  },
  missionHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#4A5568",
    textAlign: "center",
    marginBottom: 12,
  },
  escalationBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  escalationText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: AMBER,
    textAlign: "center",
  },
  // Mission overlay
  missionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,11,20,0.95)",
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missionCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 24,
    alignItems: "center",
  },
  missionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,212,170,0.08)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.2)",
    marginBottom: 12,
  },
  missionBadgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: TEAL,
  },
  missionTitle: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 24,
    color: "#E8EDF5",
    marginBottom: 20,
    textAlign: "center",
  },
  missionDone: {
    alignItems: "center",
    paddingVertical: 24,
  },
  missionDoneIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  missionDoneText: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 22,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  backBtnText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#4A5568",
  },
  // Breathing mission
  breathingContainer: {
    alignItems: "center",
    width: "100%",
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  breathingCountdown: {
    fontFamily: "DMSans_700Bold",
    fontSize: 40,
  },
  breathingUnit: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#6B7A99",
  },
  breathingPhase: {
    fontFamily: "CormorantGaramond_600SemiBold",
    fontSize: 28,
    marginBottom: 8,
  },
  breathingHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#6B7A99",
    textAlign: "center",
  },
  // Gratitude mission
  gratitudePrompt: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#8FA3BF",
    textAlign: "center",
    marginBottom: 16,
  },
  gratitudeInput: {
    width: "100%",
    backgroundColor: "rgba(245,158,11,0.06)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    borderRadius: 16,
    padding: 14,
    color: "#E8EDF5",
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  gratitudeBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(245,158,11,0.2)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.5)",
    alignItems: "center",
  },
  gratitudeBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: AMBER,
  },
  gratitudeQuote: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#8FA3BF",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
});
