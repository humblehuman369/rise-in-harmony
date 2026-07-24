/**
 * Meditation Catalog (shared) — TrueHz HQ studio sessions
 *
 * Six full-length recorded meditations mirrored from the web catalog.
 * Mobile falls back to procedural nature textures for recorded keys until
 * remote MP3 streaming is wired on-device.
 */
import type { Meditation, MeditationCategory } from "@rih/shared-types";

export const MEDITATIONS: Meditation[] = [
  {
    id: "nature-meditation-174",
    title: "Nature Meditation",
    subtitle: "Ground in the living world",
    category: "healing",
    durationMinutes: 10,
    description:
      "A 10-minute TrueHz nature immersion tuned to 174 Hz — the foundation tone of calm, safety, and earth connection.",
    benefit: "Deep grounding, nervous-system calm, gentle pain-soothing quality",
    icon: "Wind",
    color: "#10B981",
    colorSecondary: "#059669",
    soundscape: "nature-meditation-174",
    musicMode: "none",
    recommendedFrequencyId: "174",
    recommendedFrequencyLabel: "174Hz Foundation",
    frequencyRationale:
      "174 Hz is traditionally linked to grounding and physical ease. This session is TrueHz-tuned to that carrier.",
    affirmation: "I am rooted, safe, and held by the earth.",
    guidance: [
      "Sit or lie down comfortably. Soften your jaw and shoulders.",
      "Breathe in for four counts, out for six. Feel the ground support you.",
      "Let the nature textures fill your awareness — no need to analyze them.",
      "If thoughts arise, name them gently and return to the sound.",
      "Rest in the 174 Hz field. You are already home.",
    ],
    isPremium: false,
  },
  {
    id: "calm-sleep-528",
    title: "Calm Sleep",
    subtitle: "Drift into restful ease",
    category: "sleep",
    durationMinutes: 10,
    description:
      "A 10-minute TrueHz evening session tuned to 528 Hz — warm, loving, and sleep-ready.",
    benefit: "Eases the mind into rest, softens tension, invites gentle sleep",
    icon: "Moon",
    color: "#6366F1",
    colorSecondary: "#4338CA",
    soundscape: "calm-sleep-528",
    musicMode: "none",
    recommendedFrequencyId: "528",
    recommendedFrequencyLabel: "528Hz Miracle Tone",
    frequencyRationale:
      "This track is TrueHz-tuned to 528 so the whole mix carries a warm, restorative quality into sleep.",
    affirmation: "I release the day. Rest comes easily to me.",
    guidance: [
      "Dim the lights. Lie on your back or side in a comfortable position.",
      "Place one hand on your heart. Feel its steady rhythm.",
      "With each exhale, let the body sink a little deeper into the bed.",
      "There is nothing to do — only listen and soften.",
      "Allow sleep to arrive whenever it is ready.",
    ],
    isPremium: false,
  },
  {
    id: "third-eye-activation-528",
    title: "Third Eye Activation",
    subtitle: "Open inner vision",
    category: "spiritual",
    durationMinutes: 17,
    description:
      "A 17-minute TrueHz journey tuned to 528 Hz for intuition, clarity, and third-eye awareness.",
    benefit: "Sharpens intuition, clears mental fog, deepens spiritual focus",
    icon: "Eye",
    color: "#8B5CF6",
    colorSecondary: "#6D28D9",
    soundscape: "third-eye-activation-528",
    musicMode: "none",
    recommendedFrequencyId: "528",
    recommendedFrequencyLabel: "528Hz Miracle Tone",
    frequencyRationale:
      "TrueHz-tuned to 528 Hz — a bright, clarifying carrier that supports insight and heart-mind coherence.",
    affirmation: "I trust my inner vision. Clarity rises naturally.",
    guidance: [
      "Sit with a tall spine. Soften the gaze or close the eyes.",
      "Bring gentle attention to the point between the eyebrows.",
      "Breathe slowly. On each inhale, sense light gathering at the third eye.",
      "Observe any images or knowing without grasping.",
      "Rest in open awareness until the session completes.",
    ],
    isPremium: true,
  },
  {
    id: "reiki-healing-garden-285",
    title: "Reiki Healing Garden",
    subtitle: "30 minutes of restorative flow",
    category: "healing",
    durationMinutes: 30,
    description:
      "A half-hour TrueHz Reiki-inspired garden of sound, tuned to 285 Hz for quantum renewal and soft energetic flow.",
    benefit: "Supports healing rest, energetic renewal, deep relaxation",
    icon: "Heart",
    color: "#F97316",
    colorSecondary: "#EA580C",
    soundscape: "reiki-healing-garden-285",
    musicMode: "none",
    recommendedFrequencyId: "285",
    recommendedFrequencyLabel: "285Hz Quantum Cognition",
    frequencyRationale:
      "285 Hz is associated with renewal and restoration. The entire garden bed is TrueHz-tuned to this carrier.",
    affirmation: "Every cell of my body knows how to heal. I allow restoration.",
    guidance: [
      "Lie down or sit supported. Invite the body to receive.",
      "Scan from crown to feet, releasing any held tension.",
      "Imagine warm light moving through each area you notice.",
      "Stay present with the garden of sound — no effort required.",
      "When the session ends, take three slow breaths before rising.",
    ],
    isPremium: true,
  },
  {
    id: "deep-serenity-444",
    title: "Deep Serenity",
    subtitle: "30-minute still waters",
    category: "stress",
    durationMinutes: 30,
    description:
      "A half-hour TrueHz serenity field tuned to 444 Hz — spacious, steady, and profoundly calming.",
    benefit: "Dissolves stress, steadies breath, restores emotional balance",
    icon: "Droplets",
    color: "#0EA5E9",
    colorSecondary: "#0284C7",
    soundscape: "deep-serenity-444",
    musicMode: "none",
    recommendedFrequencyId: "444",
    recommendedFrequencyLabel: "444Hz Concert Pitch",
    frequencyRationale:
      "444 Hz is a bright concert pitch used in healing music traditions. This session is TrueHz-tuned to 444.",
    affirmation: "I am calm. Serenity moves through me with every breath.",
    guidance: [
      "Find a quiet place. Let the eyes close.",
      "Match your breath to the slow rise and fall of the music.",
      "Release the jaw, the hands, the belly.",
      "If stress returns, greet it and return to the sound.",
      "Rest here for the full half hour if you can.",
    ],
    isPremium: true,
  },
  {
    id: "spiritual-meditation-444",
    title: "Spiritual Meditation",
    subtitle: "30-minute open awareness",
    category: "spiritual",
    durationMinutes: 30,
    description:
      "A half-hour TrueHz spiritual sit tuned to 444 Hz — expansive and ideal for open-awareness practice.",
    benefit: "Deepens presence, expands spiritual connection, quiets the mind",
    icon: "Sparkles",
    color: "#A855F7",
    colorSecondary: "#7C3AED",
    soundscape: "spiritual-meditation-444",
    musicMode: "none",
    recommendedFrequencyId: "444",
    recommendedFrequencyLabel: "444Hz Concert Pitch",
    frequencyRationale:
      "TrueHz-tuned to 444 Hz for sustained spiritual practice without spoken guidance.",
    affirmation: "I am awareness itself. All arises and passes within me.",
    guidance: [
      "Settle into your meditation posture. Hands soft, spine long.",
      "Rest attention lightly on the sound — your only landmark.",
      "When thoughts appear, let them pass like clouds.",
      "Expand awareness to include the whole body and the room.",
      "Remain open until the session completes. No goal but being.",
    ],
    isPremium: true,
  },
];

export const MEDITATION_CATEGORIES: {
  id: MeditationCategory | "all";
  label: string;
  icon: string;
}[] = [
  { id: "all", label: "All", icon: "Grid3X3" },
  { id: "sleep", label: "Sleep", icon: "Moon" },
  { id: "stress", label: "Stress Relief", icon: "Wind" },
  { id: "healing", label: "Healing", icon: "Heart" },
  { id: "spiritual", label: "Spiritual", icon: "Sparkles" },
];

/** Free (non-premium) TrueHz sessions — used by mobile paywall gates. */
export const FREE_MEDITATIONS = MEDITATIONS.filter((m) => !m.isPremium);
