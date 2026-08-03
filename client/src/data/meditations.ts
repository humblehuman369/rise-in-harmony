/**
 * Meditation Catalog — TrueHz HQ studio sessions
 *
 * Nine full-length recorded meditations (not procedural beds). Each track is a
 * complete TrueHz-tuned music session; soundscape keys map to CDN MP3s in
 * backgroundLoops / RECORDED_NATURE_URLS. musicMode is "none" because the
 * frequency and ambience are baked into the recording.
 *
 * Frequency overlay (Sound + Frequency mode):
 * All tracks now pair with a sub-audible "felt, not heard" binaural frequency
 * that matches the track's therapeutic intent. The TrueHz master audio plays
 * unchanged; the DDS engine adds a gentle binaural carrier pulsed at the
 * target brainwave rate beneath the soundscape.
 */

export type MeditationCategory =
  | "morning"
  | "sleep"
  | "stress"
  | "focus"
  | "healing"
  | "spiritual";

export type MeditationSoundscape =
  | "calm-sleep-528"
  | "deep-serenity-444"
  | "nature-meditation-174"
  | "reiki-healing-garden-285"
  | "spiritual-meditation-444"
  | "third-eye-activation-528"
  | "deep-into-nature-60"
  | "inner-calling-60"
  | "peaceful-ocean-60"
  | "silence";

export interface MeditationTrack {
  id: string;
  title: string;
  subtitle: string;
  category: MeditationCategory;
  durationMinutes: number;
  description: string;
  benefit: string;
  /** Lucide icon name for the card */
  icon: string;
  /** Accent color for the card gradient */
  color: string;
  /** Secondary color for gradient */
  colorSecondary: string;
  /** Recorded TrueHz soundscape key (or silence) */
  soundscape: MeditationSoundscape;
  /** Music mode — always "none" for self-contained TrueHz tracks */
  musicMode: "ambient" | "drone" | "crystal" | "none";
  /** ID from FREQUENCIES catalog — the sub-audible binaural pairing */
  recommendedFrequencyId: string;
  /** Short label for the recommended frequency */
  recommendedFrequencyLabel: string;
  /** Why this frequency pairs well */
  frequencyRationale: string;
  /** Affirmation or intention for this meditation */
  affirmation: string;
  /** Step-by-step guidance script (shown as on-screen prompts) */
  guidance: string[];
  isPremium: boolean;
}

export const MEDITATIONS: MeditationTrack[] = [
  {
    id: "nature-meditation-174",
    title: "Nature Meditation",
    subtitle: "Ground in the living world",
    category: "healing",
    durationMinutes: 10,
    description:
      "A 10-minute TrueHz nature immersion tuned to 174 Hz — the foundation tone of calm, safety, and earth connection. Let forest and field textures settle your nervous system.",
    benefit: "Deep grounding, nervous-system calm, gentle pain-soothing quality",
    icon: "Wind",
    color: "#10B981",
    colorSecondary: "#059669",
    soundscape: "nature-meditation-174",
    musicMode: "none",
    recommendedFrequencyId: "alpha-isochronic",
    recommendedFrequencyLabel: "Alpha Isochronic 10Hz — Relaxed Presence",
    frequencyRationale:
      "10 Hz Alpha is the brainwave state of calm, relaxed awareness — the state you naturally enter when you step outside and breathe. Unlike binaural beats, isochronic pulses work without headphones. You will feel a gentle, rhythmic presence beneath the nature sounds. No tone, no hum — just a quiet rhythm guiding your brain into ease.",
    affirmation: "I am rooted, safe, and held by the earth.",
    guidance: [
      "Sit or lie down comfortably. Soften your jaw and shoulders.",
      "Breathe in for four counts, out for six. Feel the ground support you.",
      "Let the nature textures fill your awareness — no need to analyze them.",
      "If thoughts arise, name them gently and return to the sound.",
      "Rest in the Earth's own frequency. You are already home.",
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
      "A 10-minute TrueHz evening session tuned to 528 Hz — warm, loving, and sleep-ready. Ideal for winding down before bed or a midday reset.",
    benefit: "Eases the mind into rest, softens tension, invites gentle sleep",
    icon: "Moon",
    color: "#6366F1",
    colorSecondary: "#4338CA",
    soundscape: "calm-sleep-528",
    musicMode: "none",
    recommendedFrequencyId: "delta",
    recommendedFrequencyLabel: "Delta 3Hz — Deep Sleep",
    frequencyRationale:
      "3 Hz is the Delta brainwave state — the frequency your brain naturally produces in deep, restorative sleep. This binaural beat is felt as a slow, rhythmic pulse beneath the music, gently guiding your brain toward sleep onset. Headphones recommended.",
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
      "A 17-minute TrueHz journey tuned to 528 Hz for intuition, clarity, and third-eye awareness. Spacious, luminous, and deeply inward.",
    benefit: "Sharpens intuition, clears mental fog, deepens spiritual focus",
    icon: "Eye",
    color: "#8B5CF6",
    colorSecondary: "#6D28D9",
    soundscape: "third-eye-activation-528",
    musicMode: "none",
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "Theta 6Hz — Inner Vision Gateway",
    frequencyRationale:
      "6 Hz is the Theta brainwave state — the threshold between waking and dreaming, where intuition, imagery, and inner knowing arise most naturally. This binaural beat is felt as a gentle, rhythmic presence beneath the music, opening the door to inner vision. Headphones recommended.",
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
      "A half-hour TrueHz Reiki-inspired garden of sound, tuned to 285 Hz — quantum renewal, tissue-level restoration, and soft energetic flow.",
    benefit: "Supports healing rest, energetic renewal, deep relaxation",
    icon: "Heart",
    color: "#F97316",
    colorSecondary: "#EA580C",
    soundscape: "reiki-healing-garden-285",
    musicMode: "none",
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "Theta 6Hz — Deep Healing Rest",
    frequencyRationale:
      "6 Hz Theta is the brainwave state associated with deep rest, cellular restoration, and the body's natural healing processes. Felt as a slow, barely perceptible pulse beneath the garden soundscape, it creates the neurological conditions for genuine restoration. Headphones recommended.",
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
      "A half-hour TrueHz serenity field tuned to 444 Hz — spacious, steady, and profoundly calming for stress release and contemplative rest.",
    benefit: "Dissolves stress, steadies breath, restores emotional balance",
    icon: "Droplets",
    color: "#0EA5E9",
    colorSecondary: "#0284C7",
    soundscape: "deep-serenity-444",
    musicMode: "none",
    recommendedFrequencyId: "alpha",
    recommendedFrequencyLabel: "Alpha 10Hz — Relaxed Calm",
    frequencyRationale:
      "10 Hz is the Alpha brainwave state — calm, alert, and present. Athletes call it the zone; meditators call it presence. This binaural beat is felt as a gentle, steady rhythm beneath the music, dissolving stress without inducing drowsiness. Headphones recommended.",
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
      "A half-hour TrueHz spiritual sit tuned to 444 Hz — expansive, devotional, and ideal for open-awareness or contemplative prayer.",
    benefit: "Deepens presence, expands spiritual connection, quiets the mind",
    icon: "Sparkles",
    color: "#A855F7",
    colorSecondary: "#7C3AED",
    soundscape: "spiritual-meditation-444",
    musicMode: "none",
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "Theta 6Hz — Contemplative Presence",
    frequencyRationale:
      "6 Hz Theta is the brainwave state of sustained meditation, contemplative prayer, and open awareness. Felt as a barely perceptible pulse beneath the music, it supports the depth of presence this session is designed for. Headphones recommended.",
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
      "A full-hour journey into living forest textures — birdsong, rustling leaves, gentle streams, and earth resonance. Let nature's own frequency field restore your nervous system.",
    benefit: "Deep nervous system reset, stress dissolution, primal reconnection with the natural world",
    icon: "Wind",
    color: "#22C55E",
    colorSecondary: "#16A34A",
    soundscape: "deep-into-nature-60",
    musicMode: "none",
    recommendedFrequencyId: "schumann",
    recommendedFrequencyLabel: "Schumann 7.83Hz — Earth's Heartbeat",
    frequencyRationale:
      "7.83 Hz is the Schumann resonance — the Earth's own electromagnetic pulse, generated by lightning activity in the atmosphere. Felt as a subtle rhythm beneath the forest soundscape, it creates a resonance between your nervous system and the living planet. You will not hear it; you will feel it. Headphones recommended.",
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
      "A full-hour contemplative soundscape designed for deep inner listening. Subtle tonal layers guide awareness inward, creating space for insight, clarity, and authentic self-connection.",
    benefit: "Clarity of purpose, deep self-connection, access to inner wisdom and intuition",
    icon: "Eye",
    color: "#8B5CF6",
    colorSecondary: "#6D28D9",
    soundscape: "inner-calling-60",
    musicMode: "none",
    recommendedFrequencyId: "theta",
    recommendedFrequencyLabel: "Theta 6Hz — Inner Wisdom Gateway",
    frequencyRationale:
      "6 Hz Theta is the brainwave state where the subconscious opens — where intuition, inner knowing, and authentic self-connection arise most naturally. Felt as a slow, gentle pulse beneath the music, it creates the neurological conditions for hearing what has always been calling. Headphones recommended.",
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
      "A full-hour ocean immersion — waves arriving and receding in their own perfect rhythm. The most ancient of all healing sounds, tuned to wash away tension and restore the natural flow of breath.",
    benefit: "Stress release, emotional cleansing, deep relaxation, improved sleep onset",
    icon: "Droplets",
    color: "#3B82F6",
    colorSecondary: "#1D4ED8",
    soundscape: "peaceful-ocean-60",
    musicMode: "none",
    recommendedFrequencyId: "delta",
    recommendedFrequencyLabel: "Delta 3Hz — Deep Rest",
    frequencyRationale:
      "3 Hz is the Delta brainwave state — the frequency of deep, dreamless sleep and profound physical restoration. Felt as a slow, barely perceptible pulse beneath the ocean waves, it mirrors the ocean's own rhythm and gently guides the nervous system toward deep rest. Headphones recommended.",
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
