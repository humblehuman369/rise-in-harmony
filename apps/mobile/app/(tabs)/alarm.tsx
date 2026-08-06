/**
 * Alarm Tab Screen
 * Healing alarm scheduler — create, toggle, and delete frequency-based alarms.
 * Sprint 2: Added Wake Sequence selector (Gentle Morning + Chakra Awakening).
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Platform,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { FREQUENCIES } from "@rih/shared-utils";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { createVoice } from "@/lib/synth";
import type { SynthVoice } from "@/lib/synth";

// CDN URLs for wake-appropriate meditation tracks only (used in test preview + alarm playback).
// Sleep-inducing tracks removed: calm-sleep, deep-serenity, spiritual-meditation,
// inner-calling, reiki-healing-garden, third-eye-activation.
const MEDITATION_CDN_URLS: Record<string, string> = {
  "nature-meditation-174": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ySLrOnBvjVJpOcpp.mp3",
  "deep-into-nature-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/WKmRGyioQaoQKeeJ.mp3",
  "peaceful-ocean-60": "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/gjiHzXouliJdAAeH.mp3",
};
const NATURE_ASSETS: Record<string, number> = {
  "ambient-rain": require("../../assets/sounds/ambient-rain.mp3"),
  "ambient-ocean": require("../../assets/sounds/ambient-ocean.mp3"),
  "ambient-forest": require("../../assets/sounds/ambient-forest.mp3"),
  "ambient-wind": require("../../assets/sounds/ambient-wind.mp3"),
  "ambient-fire": require("../../assets/sounds/ambient-fire.mp3"),
};
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  useAlarmNotifications,
  scheduleAlarm,
  cancelAlarm,
  cancelAllAlarms,
  requestAlarmPermissions,
} from "@/hooks/useAlarmNotifications";
import type { Alarm, AlarmDayOfWeek } from "@rih/shared-types";
import AlarmRingingScreen from "@/components/AlarmRingingScreen";

const ALARMS_STORAGE_KEY = "rih_alarms";

// ─── Wake Sequence types ────────────────────────────────────────────────────

type WakeSequenceId = "none" | "gentle-morning" | "deep-sleep-wake" | "chakra-awakening";
type SleepProfile = "light" | "normal" | "heavy" | "very-heavy";

const SLEEP_PROFILES: Array<{ id: SleepProfile; label: string; fadeMin: number; color: string }> = [
  { id: "light", label: "Light Sleeper", fadeMin: 8, color: "#00D4AA" },
  { id: "normal", label: "Normal", fadeMin: 6, color: "#6C5CE7" },
  { id: "heavy", label: "Heavy Sleeper", fadeMin: 4, color: "#F59E0B" },
  { id: "very-heavy", label: "Very Heavy", fadeMin: 3, color: "#EF4444" },
];

interface WakeSequence {
  id: WakeSequenceId;
  label: string;
  description: string;
  isPremium: boolean;
  color: string;
  steps: Array<{ hz: number; name: string; durationMin: number }>;
}

const WAKE_SEQUENCES: WakeSequence[] = [
  {
    id: "none",
    label: "Single Frequency",
    description: "Wake to one chosen frequency",
    isPremium: false,
    color: colors.textMuted,
    steps: [],
  },
  {
    id: "gentle-morning",
    label: "Gentle Morning",
    description: "432 Hz → 528 Hz progressive fade-in",
    isPremium: false,
    color: "#00D4AA",
    steps: [
      { hz: 432, name: "Natural Harmony", durationMin: 3 },
      { hz: 528, name: "Miracle Tone", durationMin: 2 },
    ],
  },
  {
    id: "deep-sleep-wake",
    label: "Deep Sleep Wake",
    description: "δ Delta → θ Theta → α Alpha — brainwave sweep",
    isPremium: false,
    color: "#A78BFA",
    steps: [
      { hz: 3, name: "Delta — Deep Sleep", durationMin: 2 },
      { hz: 6, name: "Theta — Hypnagogic", durationMin: 2 },
      { hz: 10, name: "Alpha — Wakefulness", durationMin: 1 },
    ],
  },
  {
    id: "chakra-awakening",
    label: "Chakra Awakening",
    description: "Root → Crown — 7-chakra morning progression",
    isPremium: true,
    color: "#8B5CF6",
    steps: [
      { hz: 396, name: "Root", durationMin: 1 },
      { hz: 417, name: "Sacral", durationMin: 1 },
      { hz: 528, name: "Solar Plexus", durationMin: 1 },
      { hz: 639, name: "Heart", durationMin: 1 },
      { hz: 741, name: "Throat", durationMin: 1 },
      { hz: 852, name: "Third Eye", durationMin: 1 },
      { hz: 963, name: "Crown", durationMin: 1 },
    ],
  },
];

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function saveAlarms(alarms: Alarm[]) {
  try {
    await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
  } catch {}
}

async function loadAlarms(): Promise<Alarm[]> {
  try {
    const raw = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Schedule repeat alarms for each selected day.
// iOS calendar triggers use 1 = Sunday … 7 = Saturday.
const TRIGGER_WEEKDAY: Record<AlarmDayOfWeek, number> = {
  Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7,
};

async function scheduleRepeatAlarm(alarm: Alarm): Promise<string[]> {
  const ids: string[] = [];
  if (alarm.days.length === 0) {
    const id = await scheduleAlarm(alarm);
    if (id) ids.push(id);
  } else {
    for (const day of alarm.days) {
      const id = await scheduleAlarm(alarm, TRIGGER_WEEKDAY[day]);
      if (id) ids.push(id);
    }
  }
  return ids;
}

const DAYS: AlarmDayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// Only solfeggio tones have bundled notification sounds (alarm_<hz>.wav).
// Binaural delta/theta waves are excluded — they are sleep-inducing, not wake-appropriate.
const ALARM_EXCLUDED_FREQ_IDS = new Set(["delta", "theta"]);
const ALARM_FREQUENCIES = FREQUENCIES.filter(
  (f) => f.category === "solfeggio" && !ALARM_EXCLUDED_FREQ_IDS.has(f.id)
);
// Optimal default: 528 Hz (Miracle Tone) — bright, uplifting, ideal for morning activation
const DEFAULT_FREQUENCY = FREQUENCIES.find((f) => f.id === "528") ?? FREQUENCIES[0];

let _nextId = Date.now();
function generateId(): number {
  return _nextId++;
}

function formatTime(hour: number, minute: number) {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
}

export default function AlarmScreen() {
  const router = useRouter();
  const { isPremium: userIsPremium } = usePremiumStatus();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [creating, setCreating] = useState(false);

  // New alarm form state
  const [newTime, setNewTime] = useState(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const newHour = newTime.getHours();
  const newMinute = newTime.getMinutes();
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [newDays, setNewDays] = useState<AlarmDayOfWeek[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [newFreqId, setNewFreqId] = useState(DEFAULT_FREQUENCY.id); // 528 Hz
  const [newFadeMin, setNewFadeMin] = useState(6); // Normal profile: 6-min gentle fade
  const [newSequenceId, setNewSequenceId] = useState<WakeSequenceId>("gentle-morning"); // 432→528 Hz sequence
  const [sleepProfile, setSleepProfile] = useState<SleepProfile>("normal");

  // ── Test Sound state ────────────────────────────────────────────────────────────
  const [isTesting, setIsTesting] = useState(false);
  const [testCountdown, setTestCountdown] = useState(0);
  const testAudioPlayerRef = useRef<AudioPlayer | null>(null);
  const testVoiceRef = useRef<SynthVoice | null>(null);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTest = useCallback(() => {
    if (testTimerRef.current) { clearTimeout(testTimerRef.current); testTimerRef.current = null; }
    if (testCountdownRef.current) { clearInterval(testCountdownRef.current); testCountdownRef.current = null; }
    if (testAudioPlayerRef.current) {
      try { testAudioPlayerRef.current.pause(); } catch { /* ignore */ }
      testAudioPlayerRef.current = null;
    }
    if (testVoiceRef.current) { testVoiceRef.current.stop(0.3); testVoiceRef.current = null; }
    Vibration.cancel();
    setIsTesting(false);
    setTestCountdown(0);
  }, []);

  const startTest = useCallback(async () => {
    if (isTesting) { stopTest(); return; }
    const TEST_DURATION = 10;
    setIsTesting(true);
    setTestCountdown(TEST_DURATION);
    Vibration.vibrate(100); // brief confirmation haptic

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    // Determine what to play based on selected frequency
    const freq = FREQUENCIES.find(f => f.id === newFreqId) ?? DEFAULT_FREQUENCY;
    // Play DDS frequency tone
    const voice = createVoice({ hz: freq.hz, waveform: "sine", volume: 0.85 });
    voice.start(0.5);
    testVoiceRef.current = voice;

    testCountdownRef.current = setInterval(() => {
      setTestCountdown(prev => {
        if (prev <= 1) { stopTest(); return 0; }
        return prev - 1;
      });
    }, 1000);
    testTimerRef.current = setTimeout(stopTest, TEST_DURATION * 1000);
  }, [isTesting, newFreqId, stopTest]);

  // Clean up on unmount
  useEffect(() => () => stopTest(), [stopTest]);

  // ── Alarm ringing state ─────────────────────────────────────────────────
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null);
  const snoozeCountRef = useRef<Record<number, number>>({});
  const snoozeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_SNOOZES = 2;
  const SNOOZE_MINUTES = 5;

  const handleAlarmFired = useCallback((alarm: Alarm) => {
    snoozeCountRef.current[alarm.id] = snoozeCountRef.current[alarm.id] ?? 0;
    setFiringAlarm(alarm);
  }, []);

  const handleStop = useCallback(() => {
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
    if (firingAlarm) delete snoozeCountRef.current[firingAlarm.id];
    setFiringAlarm(null);
  }, [firingAlarm]);

  const handleSnooze = useCallback(() => {
    if (!firingAlarm) return;
    const id = firingAlarm.id;
    const alarm = firingAlarm;
    const count = (snoozeCountRef.current[id] ?? 0) + 1;
    snoozeCountRef.current[id] = count;
    setFiringAlarm(null);
    if (snoozeTimerRef.current) clearTimeout(snoozeTimerRef.current);
    snoozeTimerRef.current = setTimeout(() => {
      snoozeTimerRef.current = null;
      // On 3rd snooze, switch to grounding 174Hz
      if (count >= MAX_SNOOZES) {
        setFiringAlarm({ ...alarm, frequencyHz: 174, frequencyName: "Foundation" });
      } else {
        setFiringAlarm(alarm);
      }
    }, SNOOZE_MINUTES * 60 * 1000);
  }, [firingAlarm]);

  useAlarmNotifications(handleAlarmFired);

  useEffect(() => {
    loadAlarms().then(setAlarms);
  }, []);

  const toggleDay = (day: AlarmDayOfWeek) => {
    setNewDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowAndroidPicker(false);
    if (event.type === "set" && date) setNewTime(date);
  };

  const createAlarm = useCallback(async () => {
    const granted = await requestAlarmPermissions();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Please allow notifications so your healing alarm can wake you."
      );
      return;
    }
    const freq = FREQUENCIES.find((f) => f.id === newFreqId) ?? DEFAULT_FREQUENCY;
    const sequence = WAKE_SEQUENCES.find((s) => s.id === newSequenceId);
    const label =
      newSequenceId !== "none" && sequence
        ? `${sequence.label} Wake Sequence`
        : `${freq.hz}Hz Healing Alarm`;

    const alarm: Alarm = {
      id: generateId(),
      userId: 0,
      label,
      hour: newHour,
      minute: newMinute,
      days: newDays,
      frequencyHz: freq.hz,
      frequencyName: freq.name,
      studioMixName: newSequenceId !== "none" ? newSequenceId : null,
      fadeInMinutes: newFadeMin,
      isActive: true,
      time: `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`,
      createdAt: new Date().toISOString(),
    };
    const ids = await scheduleRepeatAlarm(alarm);
    if (ids.length > 0) {
      const updated = [...(await loadAlarms()), alarm];
      await saveAlarms(updated);
      setAlarms(updated);
      setCreating(false);
    }
  }, [newHour, newMinute, newDays, newFreqId, newFadeMin, newSequenceId]);

  const toggleAlarm = useCallback(async (alarm: Alarm) => {
    if (alarm.isActive) {
      const stored = await loadAlarms();
      const target = stored.find((a) => a.id === alarm.id);
      if (target) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const notif of scheduled) {
          const data = notif.content.data as { alarm?: Alarm };
          if (data?.alarm?.id === alarm.id) {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
          }
        }
      }
      const updated = (await loadAlarms()).map((a) =>
        a.id === alarm.id ? { ...a, isActive: false } : a
      );
      await saveAlarms(updated);
      setAlarms(updated);
    } else {
      const ids = await scheduleRepeatAlarm({ ...alarm, isActive: true });
      if (ids.length > 0) {
        const updated = (await loadAlarms()).map((a) =>
          a.id === alarm.id ? { ...a, isActive: true } : a
        );
        await saveAlarms(updated);
        setAlarms(updated);
      }
    }
  }, []);

  const deleteAlarm = useCallback((alarm: Alarm) => {
    Alert.alert("Delete Alarm", `Remove the ${alarm.frequencyHz}Hz alarm?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();
          for (const notif of scheduled) {
            const data = notif.content.data as { alarm?: Alarm };
            if (data?.alarm?.id === alarm.id) {
              await Notifications.cancelScheduledNotificationAsync(notif.identifier);
            }
          }
          const updated = (await loadAlarms()).filter((a) => a.id !== alarm.id);
          await saveAlarms(updated);
          setAlarms(updated);
        },
      },
    ]);
  }, []);

  const selectedFreq = FREQUENCIES.find((f) => f.id === newFreqId) ?? DEFAULT_FREQUENCY;
  const selectedSequence = WAKE_SEQUENCES.find((s) => s.id === newSequenceId) ?? WAKE_SEQUENCES[0];

  return (
    <>
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Healing Alarm</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setCreating((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>{creating ? "Cancel" : "+ New"}</Text>
          </TouchableOpacity>
        </View>

        {/* Create form */}
        {creating && (
          <View style={styles.form}>
            {/* Time picker */}
            <Text style={styles.sectionLabel}>Wake Time</Text>
            {Platform.OS === "ios" ? (
              <View style={styles.timePickerWrap}>
                <DateTimePicker
                  value={newTime}
                  mode="time"
                  display="spinner"
                  onChange={onTimeChange}
                  themeVariant="dark"
                  textColor={colors.textPrimary}
                  style={styles.iosPicker}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.androidTimeButton}
                  onPress={() => setShowAndroidPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.androidTimeText}>
                    {formatTime(newHour, newMinute)}
                  </Text>
                  <Text style={styles.androidTimeHint}>Tap to change</Text>
                </TouchableOpacity>
                {showAndroidPicker && (
                  <DateTimePicker
                    value={newTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                  />
                )}
              </>
            )}

            {/* Day selector */}
            <Text style={styles.sectionLabel}>Repeat</Text>
            <View style={styles.dayRow}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    newDays.includes(day) && styles.dayChipActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      newDays.includes(day) && styles.dayChipTextActive,
                    ]}
                  >
                    {day.slice(0, 1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Wake Sequence selector (Sprint 2 — R-04) ─────────────── */}
            <Text style={styles.sectionLabel}>Wake Sequence</Text>
            <View style={styles.sequenceGrid}>
              {WAKE_SEQUENCES.map((seq) => {
                const locked = seq.isPremium && !userIsPremium;
                const isActive = newSequenceId === seq.id;
                return (
                  <TouchableOpacity
                    key={seq.id}
                    style={[
                      styles.sequenceCard,
                      isActive && {
                        borderColor: seq.color + "80",
                        backgroundColor: seq.color + "12",
                      },
                    ]}
                    onPress={() =>
                      locked ? router.push("/paywall") : setNewSequenceId(seq.id)
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.sequenceCardHeader}>
                      <Text style={[styles.sequenceLabel, isActive && { color: seq.color }]}>
                        {locked ? "🔒 " : ""}{seq.label}
                      </Text>
                      {seq.isPremium && !locked && (
                        <View style={[styles.premiumBadge, { backgroundColor: seq.color + "25" }]}>
                          <Text style={[styles.premiumBadgeText, { color: seq.color }]}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sequenceDesc}>{seq.description}</Text>
                    {seq.steps.length > 0 && (
                      <View style={styles.sequenceSteps}>
                        {seq.steps.map((step, i) => (
                          <View key={i} style={styles.sequenceStep}>
                            <View
                              style={[
                                styles.sequenceStepDot,
                                { backgroundColor: seq.color },
                              ]}
                            />
                            <Text style={styles.sequenceStepText}>
                              {step.hz}Hz · {step.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Sleep Profile selector ──────────────────────────────── */}
            <Text style={styles.sectionLabel}>Sleep Profile</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              {SLEEP_PROFILES.map((profile) => {
                const isActive = sleepProfile === profile.id;
                return (
                  <TouchableOpacity
                    key={profile.id}
                    style={[
                      styles.freqChip,
                      isActive && {
                        backgroundColor: profile.color + '25',
                        borderColor: profile.color + '60',
                      },
                    ]}
                    onPress={() => { setSleepProfile(profile.id); setNewFadeMin(profile.fadeMin); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.freqChipHz,
                      isActive && { color: profile.color },
                    ]}>
                      {profile.label}
                    </Text>
                    <Text style={styles.freqChipName}>{profile.fadeMin}m fade</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Frequency selector — shown only when no sequence is selected */}
            {newSequenceId === "none" && (
              <>
                <Text style={styles.sectionLabel}>Healing Frequency</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.freqScroll}
                >
                  {ALARM_FREQUENCIES.map((f) => {
                    const locked = f.isPremium && !userIsPremium;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[
                          styles.freqChip,
                          newFreqId === f.id && {
                            backgroundColor: f.color + "25",
                            borderColor: f.color + "60",
                          },
                        ]}
                        onPress={() =>
                          locked ? router.push("/paywall") : setNewFreqId(f.id)
                        }
                      >
                        <Text style={[styles.freqChipHz, { color: f.color }]}>
                          {locked ? "🔒 " : ""}
                          {f.hz}Hz
                        </Text>
                        <Text style={styles.freqChipName}>{f.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Fade-in */}
            <Text style={styles.sectionLabel}>
              Fade-in: {newFadeMin} min
            </Text>
            <View style={styles.fadeRow}>
              {[1, 3, 5, 7, 10].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.fadeChip,
                    newFadeMin === m && styles.fadeChipActive,
                  ]}
                  onPress={() => setNewFadeMin(m)}
                >
                  <Text
                    style={[
                      styles.fadeChipText,
                      newFadeMin === m && styles.fadeChipTextActive,
                    ]}
                  >
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview + Save */}
            <View
              style={[
                styles.previewCard,
                {
                  borderColor:
                    newSequenceId !== "none"
                      ? selectedSequence.color + "40"
                      : selectedFreq.color + "40",
                },
              ]}
            >
              <Text style={styles.previewTime}>
                {formatTime(newHour, newMinute)}
              </Text>
              {newSequenceId !== "none" ? (
                <>
                  <Text
                    style={[styles.previewFreq, { color: selectedSequence.color }]}
                  >
                    {selectedSequence.label}
                  </Text>
                  <Text style={styles.previewDays}>
                    {selectedSequence.steps.length} frequencies · {selectedSequence.steps.reduce((a, s) => a + s.durationMin, 0)} min
                  </Text>
                </>
              ) : (
                <Text style={[styles.previewFreq, { color: selectedFreq.color }]}>
                  {selectedFreq.hz}Hz · {selectedFreq.name}
                </Text>
              )}
              <Text style={styles.previewDays}>
                {newDays.length === 7
                  ? "Every day"
                  : newDays.length === 0
                  ? "Once"
                  : newDays.join(", ")}
              </Text>
            </View>

            {/* Test Sound button */}
            <TouchableOpacity
              style={[
                styles.testSoundBtn,
                isTesting && styles.testSoundBtnActive,
              ]}
              onPress={startTest}
              activeOpacity={0.85}
            >
              <Text style={[
                styles.testSoundBtnText,
                isTesting && { color: '#EF4444' },
              ]}>
                {isTesting ? `⏹ Stop Preview (${testCountdown}s)` : '🔊 Test Sound (10s)'}
              </Text>
            </TouchableOpacity>
            {isTesting && (
              <Text style={styles.testSoundHint}>
                Playing your selected alarm sound at full volume
              </Text>
            )}

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={createAlarm}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Set Healing Alarm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alarm list */}
        {alarms.length === 0 && !creating ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏰</Text>
            <Text style={styles.emptyTitle}>No alarms yet</Text>
            <Text style={styles.emptyText}>
              Tap "+ New" to replace your jarring alarm with a healing frequency.
            </Text>
          </View>
        ) : (
          alarms.map((alarm) => (
            <TouchableOpacity
              key={alarm.id}
              style={styles.alarmCard}
              onLongPress={() => deleteAlarm(alarm)}
              activeOpacity={0.9}
            >
              <View style={styles.alarmLeft}>
                <Text style={styles.alarmTime}>
                  {formatTime(alarm.hour, alarm.minute)}
                </Text>
                <Text style={styles.alarmMeta}>
                  {alarm.days.length === 7
                    ? "Every day"
                    : alarm.days.join(", ")} · {alarm.frequencyHz}Hz
                </Text>
                <Text style={styles.alarmLabel}>{alarm.label}</Text>
              </View>
              <Switch
                value={alarm.isActive}
                onValueChange={() => toggleAlarm(alarm)}
                trackColor={{
                  false: "rgba(255,255,255,0.1)",
                  true: "rgba(0,212,170,0.4)",
                }}
                thumbColor={alarm.isActive ? colors.teal : colors.textMuted}
              />
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.hint}>Long-press an alarm to delete it.</Text>
      </ScrollView>
    </SafeAreaView>

    {/* Full-screen alarm ringing overlay — shown when alarm fires */}
    {firingAlarm && (
      <AlarmRingingScreen
        alarm={firingAlarm}
        sleepProfile={sleepProfile}
        snoozeCount={snoozeCountRef.current[firingAlarm.id] ?? 0}
        maxSnoozes={MAX_SNOOZES}
        onStop={handleStop}
        onSnooze={handleSnooze}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scroll: { paddingBottom: spacing[16] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: "rgba(0,212,170,0.15)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.3)",
    borderRadius: radii.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
  },
  addBtnText: {
    color: colors.teal,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  // Form
  form: {
    marginHorizontal: spacing[5],
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    padding: spacing[5],
    marginBottom: spacing[5],
    ...shadows.md,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: spacing[2],
    marginTop: spacing[4],
  },
  timePickerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  iosPicker: {
    alignSelf: "center",
    height: 180,
    width: 260,
  },
  androidTimeButton: {
    alignItems: "center",
    paddingVertical: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
  },
  androidTimeText: {
    fontSize: fontSizes["3xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  androidTimeHint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing[1],
  },
  dayRow: {
    flexDirection: "row",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dayChipActive: {
    backgroundColor: "rgba(0,212,170,0.2)",
    borderColor: "rgba(0,212,170,0.5)",
  },
  dayChipText: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: "600" },
  dayChipTextActive: { color: colors.teal },
  // Wake sequence cards
  sequenceGrid: {
    gap: spacing[3],
  },
  sequenceCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: spacing[4],
  },
  sequenceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[1],
  },
  sequenceLabel: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  premiumBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sequenceDesc: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginBottom: spacing[2],
  },
  sequenceSteps: {
    gap: spacing[1],
    marginTop: spacing[1],
  },
  sequenceStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  sequenceStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sequenceStepText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Frequency selector
  freqScroll: { marginHorizontal: -spacing[2] },
  freqChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginRight: spacing[2],
    alignItems: "center",
    minWidth: 70,
  },
  freqChipHz: { fontSize: fontSizes.sm, fontWeight: "700" },
  freqChipName: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  fadeRow: { flexDirection: "row", gap: spacing[2] },
  fadeChip: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  fadeChipActive: {
    backgroundColor: "rgba(0,212,170,0.15)",
    borderColor: "rgba(0,212,170,0.4)",
  },
  fadeChipText: { fontSize: fontSizes.sm, color: colors.textMuted, fontWeight: "600" },
  fadeChipTextActive: { color: colors.teal },
  previewCard: {
    marginTop: spacing[5],
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
  },
  previewTime: {
    fontSize: fontSizes["3xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  previewFreq: { fontSize: fontSizes.base, fontWeight: "600", marginTop: 4 },
  previewDays: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  testSoundBtn: {
    marginTop: spacing[3],
    backgroundColor: 'rgba(0,212,170,0.06)',
    borderRadius: radii.full,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.25)',
  },
  testSoundBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  testSoundBtnText: {
    color: colors.teal,
    fontSize: fontSizes.sm,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  testSoundHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  saveBtn: {
    marginTop: spacing[4],
    backgroundColor: colors.teal,
    borderRadius: radii.full,
    paddingVertical: spacing[4],
    alignItems: "center",
  },
  saveBtnText: {
    color: colors.bgDeep,
    fontSize: fontSizes.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  // Alarm list
  alarmCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  alarmLeft: { flex: 1 },
  alarmTime: {
    fontSize: fontSizes["2xl"],
    color: colors.textPrimary,
    fontWeight: "700",
  },
  alarmMeta: { fontSize: fontSizes.sm, color: colors.teal, marginTop: 2 },
  alarmLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  // Empty state
  empty: {
    alignItems: "center",
    paddingTop: spacing[16],
    paddingHorizontal: spacing[8],
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing[4] },
  emptyTitle: {
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  hint: {
    textAlign: "center",
    fontSize: fontSizes.xs,
    color: colors.textDim,
    marginTop: spacing[4],
    paddingHorizontal: spacing[8],
  },
});
