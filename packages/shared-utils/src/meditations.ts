/**
 * Meditation Catalog (shared) — TrueHz HQ studio sessions
 *
 * Nine full-length recorded meditations mirrored from the web catalog.
 * Masters stream from Manus CDN (see mobile useMeditationPlayer /
 * web backgroundLoops). Procedural nature textures are the offline fallback.
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
    recommendedFrequencyId: "schumann",
    recommendedFrequencyLabel: "7.83Hz Schumann Resonance",
    frequencyRationale:
      "The Schumann Resonance (7.83 Hz) is Earth's own electromagnetic heartbeat — pairing it with this nature session deepens the grounding connection at a sub-audible, felt level.",
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
    recommendedFrequencyId: "delta",
    recommendedFrequencyLabel: "3Hz Delta Waves",
    frequencyRationale:
      "Delta (0.5–4 Hz) is the brain state of deep, dreamless sleep. A 3 Hz binaural beat gently guides your brain toward sleep onset — the perfect sub-audible companion for this wind-down session.",
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
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "6Hz Theta Waves",
    frequencyRationale:
      "Theta (4–8 Hz) is the gateway brainwave state for intuition, inner vision, and deep insight. A 6 Hz binaural beat opens the third eye at a sub-audible level — felt, not heard.",
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
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "6Hz Theta Waves",
    frequencyRationale:
      "Theta (4–8 Hz) supports deep healing rest and energetic renewal. A 6 Hz binaural beat creates the receptive inner state where Reiki energy flows most freely — sub-audible and deeply felt.",
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
    recommendedFrequencyId: "alpha",
    recommendedFrequencyLabel: "10Hz Alpha Waves",
    frequencyRationale:
      "Alpha (8–12 Hz) is relaxed alertness — the calm-but-present state ideal for stress release without drowsiness. A 10 Hz binaural beat supports emotional balance sub-audibly while the music carries you.",
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
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "6Hz Theta Waves",
    frequencyRationale:
      "Theta (4–8 Hz) is the contemplative brainwave state for sustained spiritual practice and open awareness. A 6 Hz binaural beat holds you in that receptive space throughout the session.",
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
  {
    id: "deep-into-nature-60",
    title: "Deep Into Nature",
    subtitle: "60-minute forest immersion",
    category: "healing",
    durationMinutes: 60,
    description:
      "A full-hour journey into living forest textures — birdsong, rustling leaves, gentle streams, and earth resonance.",
    benefit: "Deep nervous system reset, stress dissolution, primal reconnection with the natural world",
    icon: "Wind",
    color: "#22C55E",
    colorSecondary: "#16A34A",
    soundscape: "deep-into-nature-60",
    musicMode: "none",
    recommendedFrequencyId: "schumann",
    recommendedFrequencyLabel: "7.83Hz Schumann Resonance",
    frequencyRationale:
      "The Schumann Resonance (7.83 Hz) is nature's own frequency — Earth's electromagnetic pulse. Pairing it with this 60-minute forest immersion creates a full-body resonance with the natural world, felt sub-audibly.",
    affirmation: "I belong to the earth. The earth belongs to me.",
    guidance: [
      "Find a comfortable position. Allow your body to be fully supported.",
      "Close your eyes and let the forest sounds surround you completely.",
      "Breathe slowly and naturally. There is nothing to do but receive.",
      "Notice the layers — near sounds and distant ones, movement and stillness.",
      "Let your thoughts dissolve into the soundscape. You are part of this.",
      "Rest here as long as you need. The forest holds you.",
    ],
    isPremium: false,
  },
  {
    id: "inner-calling-60",
    title: "Inner Calling",
    subtitle: "60-minute deep inner journey",
    category: "spiritual",
    durationMinutes: 60,
    description:
      "A full-hour contemplative soundscape designed for deep inner listening and authentic self-connection.",
    benefit: "Clarity of purpose, deep self-connection, access to inner wisdom and intuition",
    icon: "Eye",
    color: "#8B5CF6",
    colorSecondary: "#6D28D9",
    soundscape: "inner-calling-60",
    musicMode: "none",
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "6Hz Theta Waves",
    frequencyRationale:
      "Theta (4–8 Hz) opens the subconscious — where inner wisdom lives. A 6 Hz binaural beat creates the receptive inner state for deep self-listening and authentic insight, felt below the threshold of hearing.",
    affirmation: "I listen deeply. My inner voice is clear and true.",
    guidance: [
      "Sit or lie in a position you can hold comfortably for an hour.",
      "Set a gentle intention — not a goal, but a direction of attention.",
      "Let the music carry you inward. Follow what draws your awareness.",
      "When insights arise, simply notice them without grasping.",
      "If emotions surface, breathe through them with openness.",
      "Trust the process. What needs to be heard will be heard.",
    ],
    isPremium: true,
  },
  {
    id: "peaceful-ocean-60",
    title: "Peaceful Ocean",
    subtitle: "60-minute ocean meditation",
    category: "stress",
    durationMinutes: 60,
    description:
      "A full-hour ocean immersion — waves arriving and receding in their own perfect rhythm.",
    benefit: "Stress release, emotional cleansing, deep relaxation, improved sleep onset",
    icon: "Droplets",
    color: "#3B82F6",
    colorSecondary: "#1D4ED8",
    soundscape: "peaceful-ocean-60",
    musicMode: "none",
    recommendedFrequencyId: "delta",
    recommendedFrequencyLabel: "3Hz Delta Waves",
    frequencyRationale:
      "Delta (0.5–4 Hz) is the brain state of deep sleep and restoration. A 3 Hz binaural beat pairs with the ocean's natural wave rhythm to guide the nervous system toward deep rest — sub-audible and profoundly calming.",
    affirmation: "Like the ocean, I am vast, fluid, and at peace.",
    guidance: [
      "Lie down if possible. Let your body become heavy and still.",
      "Focus on the rhythm of the waves — each one complete in itself.",
      "Match your breath to the ocean's rhythm. Inhale as waves arrive, exhale as they recede.",
      "Feel any tension in your body being drawn out with each receding wave.",
      "You are the ocean as much as you are the shore. Both are you.",
      "Rest in this vastness. Let the water carry everything away.",
    ],
    isPremium: false,
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

