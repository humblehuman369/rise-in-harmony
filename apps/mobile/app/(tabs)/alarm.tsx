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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { colors, fontSizes, spacing, radii, shadows } from "@rih/ui-tokens";
import { FREQUENCIES } from "@rih/shared-utils";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  useAlarmNotifications,
  scheduleAlarm,
  cancelAlarm,
  cancelAllAlarms,
  requestAlarmPermissions,
} from "@/hooks/useAlarmNotifications";
import type { Alarm, AlarmDayOfWeek } from "@rih/shared-types";

const ALARMS_STORAGE_KEY = "rih_alarms";

// ─── Wake Sequence types ────────────────────────────────────────────────────

type WakeSequenceId = "none" | "gentle-morning" | "chakra-awakening";

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
const ALARM_FREQUENCIES = FREQUENCIES.filter((f) => f.category === "solfeggio");
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
  const [newFreqId, setNewFreqId] = useState(DEFAULT_FREQUENCY.id);
  const [newFadeMin, setNewFadeMin] = useState(5);
  const [newSequenceId, setNewSequenceId] = useState<WakeSequenceId>("none");

  useAlarmNotifications();

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
