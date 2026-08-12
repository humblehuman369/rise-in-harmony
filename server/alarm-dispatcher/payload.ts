import type { AlarmRecord } from "./types";

/**
 * Notification payload for a due alarm.
 *
 * Field names mirror what the existing client-side alarm path already shows
 * (see client/src/hooks/useAlarmNotifications.ts) so a push-delivered alarm and
 * an in-tab alarm read identically to the user.
 */
export function buildAlarmPayload(alarm: AlarmRecord): string {
  const soundLabel =
    alarm.soundType === "ambient"
      ? alarm.ambientLabel || "Nature Sound"
      : alarm.soundType === "meditation"
        ? alarm.meditationLabel || "Meditation"
        : alarm.soundType === "studio_mix"
          ? alarm.studioMixName || "Studio mix"
          : `${alarm.frequencyHz ?? 432}Hz ${alarm.frequencyName ?? ""}`.trim();

  return JSON.stringify({
    title: `⏰ Rise In Harmony — ${alarm.label ?? "Morning Harmony"}`,
    body: `${soundLabel} is ready to guide your ${
      alarm.kind === "wind_down" ? "evening" : "morning"
    }.`,
    tag: `rih-alarm-${alarm.id}`,
    alarmId: alarm.id,
    kind: alarm.kind,
    sound: {
      type: alarm.soundType,
      frequencyHz: alarm.frequencyHz,
      frequencyName: alarm.frequencyName,
      studioMixName: alarm.studioMixName,
      ambientId: alarm.ambientId,
      meditationId: alarm.meditationId,
    },
    wakeSequence: alarm.wakeSequence ?? "gentle",
    fadeInMinutes: alarm.fadeInMinutes,
  });
}
