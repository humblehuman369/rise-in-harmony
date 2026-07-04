/**
 * SessionJournal — post-session mood check-in modal.
 * 1–5 mood rating + optional note, persisted to AsyncStorage.
 * Shown after a meditation, studio session, or chakra journey ends.
 */
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { colors, fontSizes, spacing, radii } from "@rih/ui-tokens";
import { saveJournalEntry, type JournalEntry } from "@/lib/journal";

export const MOODS = [
  { value: 1, label: "Difficult", emoji: "😠", color: "#EF4444" },
  { value: 2, label: "Low", emoji: "🙁", color: "#F97316" },
  { value: 3, label: "Neutral", emoji: "😐", color: "#EAB308" },
  { value: 4, label: "Good", emoji: "🙂", color: "#22C55E" },
  { value: 5, label: "Radiant", emoji: "😄", color: "#00D4AA" },
] as const;

interface SessionJournalProps {
  visible: boolean;
  frequencyHz: number;
  frequencyName: string;
  durationMinutes: number;
  onClose: () => void;
  onSaved?: (entry: JournalEntry) => void;
}

export default function SessionJournal({
  visible,
  frequencyHz,
  frequencyName,
  durationMinutes,
  onClose,
  onSaved,
}: SessionJournalProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  // Reset internal state each time the modal opens
  useEffect(() => {
    if (visible) {
      setSelectedMood(null);
      setNote("");
      setSaved(false);
    }
  }, [visible]);

  // Auto-close shortly after saving
  useEffect(() => {
    if (saved) {
      const t = setTimeout(onClose, 1600);
      return () => clearTimeout(t);
    }
  }, [saved, onClose]);

  const handleSave = async () => {
    if (!selectedMood) return;
    const entry: JournalEntry = {
      id: `j_${Date.now()}`,
      timestamp: Date.now(),
      mood: selectedMood,
      note: note.trim(),
      frequencyHz,
      frequencyName,
      durationMinutes,
    };
    await saveJournalEntry(entry);
    setSaved(true);
    onSaved?.(entry);
  };

  const activeMood = MOODS.find((m) => m.value === selectedMood);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {saved ? (
            <View style={styles.savedWrap}>
              <View
                style={[
                  styles.savedCircle,
                  {
                    backgroundColor: (activeMood?.color ?? colors.teal) + "20",
                    borderColor: (activeMood?.color ?? colors.teal) + "50",
                  },
                ]}
              >
                <Text style={styles.savedEmoji}>{activeMood?.emoji}</Text>
              </View>
              <Text style={styles.savedTitle}>Session logged</Text>
              <Text style={styles.savedSub}>
                Your {durationMinutes} min session has been recorded
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>How do you feel?</Text>
              <Text style={styles.meta}>
                {frequencyHz > 0 ? `${frequencyHz}Hz · ` : ""}
                {frequencyName} · {durationMinutes} min
              </Text>

              {/* Mood selector */}
              <View style={styles.moodRow}>
                {MOODS.map((mood) => {
                  const active = selectedMood === mood.value;
                  return (
                    <TouchableOpacity
                      key={mood.value}
                      style={[
                        styles.moodCell,
                        active && {
                          backgroundColor: mood.color + "1F",
                          borderColor: mood.color + "50",
                        },
                      ]}
                      onPress={() => setSelectedMood(mood.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.moodEmoji, !active && styles.moodEmojiDim]}>
                        {mood.emoji}
                      </Text>
                      <Text
                        style={[styles.moodLabel, active && { color: mood.color }]}
                      >
                        {mood.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Note */}
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What did you notice during this session? (optional)"
                placeholderTextColor={colors.textDim}
                style={styles.noteInput}
                multiline
                numberOfLines={3}
              />

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
                  <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    { backgroundColor: activeMood?.color ?? "rgba(255,255,255,0.06)" },
                  ]}
                  onPress={handleSave}
                  disabled={!selectedMood}
                >
                  <Text
                    style={[
                      styles.saveText,
                      { color: selectedMood ? colors.bgDeep : colors.textDim },
                    ]}
                  >
                    Save Entry
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,11,20,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[5],
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.bgBorder,
    borderRadius: radii.xl,
    padding: spacing[5],
  },
  title: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  meta: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing[4],
  },
  moodRow: { flexDirection: "row", gap: spacing[2], marginBottom: spacing[4] },
  moodCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  moodEmoji: { fontSize: 22 },
  moodEmojiDim: { opacity: 0.45 },
  moodLabel: {
    fontSize: 8,
    color: colors.textDim,
    fontWeight: "700",
    marginTop: 4,
  },
  noteInput: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    minHeight: 76,
    textAlignVertical: "top",
    marginBottom: spacing[4],
  },
  btnRow: { flexDirection: "row", gap: spacing[2] },
  skipBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  skipText: { color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: "600" },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    alignItems: "center",
  },
  saveText: { fontSize: fontSizes.sm, fontWeight: "700" },
  savedWrap: { alignItems: "center", paddingVertical: spacing[5] },
  savedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  savedEmoji: { fontSize: 28 },
  savedTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  savedSub: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
});
