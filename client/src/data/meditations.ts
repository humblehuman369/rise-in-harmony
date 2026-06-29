/**
 * Meditation Catalog
 * 12 popular guided meditation styles, each with:
 *  - soundscape: ambient nature/music layers (generated via Web Audio API)
 *  - recommendedFrequencyId: the best healing frequency pairing from FREQUENCIES catalog
 *  - category: for tab filtering
 */

export type MeditationCategory =
  | "morning"
  | "sleep"
  | "stress"
  | "focus"
  | "healing"
  | "spiritual";

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
  /** Nature soundscape to layer underneath */
  soundscape: "rain" | "ocean" | "forest" | "wind" | "fire" | "bowl" | "silence";
  /** Music mode to use underneath */
  musicMode: "ambient" | "drone" | "crystal" | "none";
  /** ID from FREQUENCIES catalog — the recommended pairing */
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
  // ─── MORNING ─────────────────────────────────────────────────────────────────
  {
    id: "morning-breath",
    title: "Morning Breath Awakening",
    subtitle: "Start with intention",
    category: "morning",
    durationMinutes: 5,
    description: "A gentle 5-minute breath awareness practice to transition from sleep to wakefulness with clarity and calm.",
    benefit: "Reduces morning cortisol, sets a focused intention for the day",
    icon: "Sunrise",
    color: "#F59E0B",
    colorSecondary: "#F97316",
    soundscape: "forest",
    musicMode: "ambient",
    recommendedFrequencyId: "432hz",
    recommendedFrequencyLabel: "432Hz Natural Harmony",
    frequencyRationale: "432Hz aligns with nature's resonance, making it the ideal companion for a morning practice rooted in the natural world.",
    affirmation: "I awaken with clarity, gratitude, and open energy.",
    guidance: [
      "Find a comfortable seated position. Let your spine be tall but relaxed.",
      "Close your eyes and take three deep, slow breaths — inhale for 4 counts, exhale for 6.",
      "Allow your breath to return to its natural rhythm. Simply observe it without controlling it.",
      "Notice the sensation of air entering your nostrils, filling your chest, and releasing.",
      "If your mind wanders, gently return your attention to the breath — no judgment.",
      "Set a quiet intention for your day. Let it arise naturally, without force.",
      "Take one final deep breath. Open your eyes slowly. You are ready.",
    ],
    isPremium: false,
  },
  {
    id: "chakra-morning",
    title: "7-Chakra Morning Activation",
    subtitle: "Align your energy centers",
    category: "morning",
    durationMinutes: 10,
    description: "A 10-minute visualization journey through all seven chakras, activating each energy center from Root to Crown before you begin your day.",
    benefit: "Full-body energy alignment, emotional balance, spiritual readiness",
    icon: "Sparkles",
    color: "#00D4AA",
    colorSecondary: "#8B5CF6",
    soundscape: "bowl",
    musicMode: "crystal",
    recommendedFrequencyId: "528hz",
    recommendedFrequencyLabel: "528Hz Miracle Tone",
    frequencyRationale: "528Hz, the 'Love Frequency,' resonates with the Solar Plexus — the center of personal power — making it the anchor for a full chakra activation sequence.",
    affirmation: "All my energy centers are open, balanced, and flowing freely.",
    guidance: [
      "Sit comfortably with your spine erect. Place your hands on your knees, palms up.",
      "Begin at the Root Chakra — visualize a spinning red wheel at the base of your spine. Feel grounded.",
      "Move to the Sacral Chakra — an orange wheel just below your navel. Feel creative energy flowing.",
      "Rise to the Solar Plexus — a bright yellow sun in your stomach. Feel your personal power ignite.",
      "Open the Heart Chakra — a green light in the center of your chest. Feel love expanding outward.",
      "Activate the Throat Chakra — a blue light at your throat. Feel your authentic voice ready to speak.",
      "Awaken the Third Eye — an indigo light between your brows. Feel clarity and intuition sharpening.",
      "Crown your practice — a violet-white light at the top of your head, connecting you to the universe.",
      "Breathe deeply. All seven centers are open and aligned. You are ready to rise.",
    ],
    isPremium: false,
  },

  // ─── STRESS ──────────────────────────────────────────────────────────────────
  {
    id: "body-scan-release",
    title: "Full Body Scan & Release",
    subtitle: "Melt tension from head to toe",
    category: "stress",
    durationMinutes: 15,
    description: "A progressive body scan that systematically releases physical tension stored throughout the body, leaving you deeply relaxed.",
    benefit: "Reduces physical tension, lowers cortisol, improves body awareness",
    icon: "Scan",
    color: "#3B82F6",
    colorSecondary: "#06B6D4",
    soundscape: "rain",
    musicMode: "drone",
    recommendedFrequencyId: "396hz",
    recommendedFrequencyLabel: "396Hz Liberation",
    frequencyRationale: "396Hz is specifically associated with releasing guilt, fear, and deeply held tension — the perfect companion for a body scan focused on letting go.",
    affirmation: "I release all tension. My body is safe, relaxed, and at peace.",
    guidance: [
      "Lie down comfortably on your back. Let your feet fall open naturally. Close your eyes.",
      "Take three deep breaths. With each exhale, feel your body sink a little deeper into the surface beneath you.",
      "Bring your attention to the top of your head. Notice any sensations — tightness, tingling, warmth. Breathe into it and let it soften.",
      "Slowly scan down: forehead, eyes, jaw. Let your jaw drop slightly. Release the muscles around your eyes.",
      "Move to your neck and shoulders — the most common place we hold stress. Exhale and let them drop.",
      "Continue down: chest, upper back, arms, hands. With each breath, release a little more.",
      "Scan your belly and lower back. Notice if you're holding your breath here. Let it go.",
      "Move through your hips, thighs, knees, calves, and feet. Let each area become heavy and warm.",
      "Rest in full-body awareness. You are completely relaxed. Stay here as long as you need.",
    ],
    isPremium: false,
  },
  {
    id: "4-7-8-breath",
    title: "4-7-8 Anxiety Reset",
    subtitle: "Activate your calm response",
    category: "stress",
    durationMinutes: 7,
    description: "The 4-7-8 breathing technique activates the parasympathetic nervous system, rapidly reducing anxiety and stress within minutes.",
    benefit: "Reduces anxiety in minutes, lowers heart rate, activates rest-and-digest response",
    icon: "Wind",
    color: "#06B6D4",
    colorSecondary: "#3B82F6",
    soundscape: "ocean",
    musicMode: "ambient",
    recommendedFrequencyId: "417hz",
    recommendedFrequencyLabel: "417Hz Transmutation",
    frequencyRationale: "417Hz facilitates change and clears traumatic experiences — ideal for interrupting an anxiety cycle and resetting your nervous system.",
    affirmation: "I am calm. I am safe. My breath is my anchor.",
    guidance: [
      "Sit upright or lie down. Place the tip of your tongue against the ridge behind your upper front teeth.",
      "Exhale completely through your mouth, making a whoosh sound.",
      "Close your mouth and inhale quietly through your nose for 4 counts.",
      "Hold your breath for 7 counts.",
      "Exhale completely through your mouth with a whoosh for 8 counts.",
      "This is one cycle. Repeat for 4 cycles to start. You can build to 8 cycles over time.",
      "Notice how your body feels after each cycle — softer, calmer, more spacious.",
      "Return to natural breathing. Rest in the stillness you have created.",
    ],
    isPremium: false,
  },

  // ─── FOCUS ───────────────────────────────────────────────────────────────────
  {
    id: "focused-attention",
    title: "Deep Focus Meditation",
    subtitle: "Sharpen your concentration",
    category: "focus",
    durationMinutes: 10,
    description: "A focused attention practice that trains the mind to sustain concentration on a single point, building the mental muscle for deep work.",
    benefit: "Improves concentration, reduces mental chatter, prepares the mind for deep work",
    icon: "Target",
    color: "#8B5CF6",
    colorSecondary: "#6366F1",
    soundscape: "silence",
    musicMode: "drone",
    recommendedFrequencyId: "binaural-alpha",
    recommendedFrequencyLabel: "Alpha Waves (10Hz)",
    frequencyRationale: "Alpha binaural beats (10Hz) induce a state of relaxed alertness — the optimal brainwave state for focused, creative work.",
    affirmation: "My mind is clear, sharp, and fully present.",
    guidance: [
      "Sit upright with your spine tall. Set a timer for 10 minutes so you don't need to watch the clock.",
      "Choose your anchor: the sensation of your breath at the nostrils, or a single point on the wall in front of you.",
      "Direct your full attention to that anchor. Notice every detail — the texture, the rhythm, the subtle changes.",
      "When your mind wanders — and it will — simply notice that it has wandered, and gently return. No frustration.",
      "Each time you return your attention, you are doing a mental 'rep.' This is the practice.",
      "If thoughts arise, label them briefly: 'planning,' 'memory,' 'worry' — then return to your anchor.",
      "In the final minute, broaden your awareness to include your whole body and the space around you.",
      "Open your eyes. Your focus is now primed. Move directly into your most important work.",
    ],
    isPremium: false,
  },
  {
    id: "mantra-focus",
    title: "Mantra Concentration",
    subtitle: "One word, one mind",
    category: "focus",
    durationMinutes: 12,
    description: "A mantra-based meditation using a single Sanskrit syllable to anchor the wandering mind and cultivate single-pointed concentration.",
    benefit: "Deepens concentration, quiets mental noise, builds meditative stability",
    icon: "Repeat",
    color: "#A855F7",
    colorSecondary: "#8B5CF6",
    soundscape: "bowl",
    musicMode: "crystal",
    recommendedFrequencyId: "741hz",
    recommendedFrequencyLabel: "741Hz Awakening",
    frequencyRationale: "741Hz activates the Throat Chakra — the center of authentic expression — amplifying the vibrational power of mantra repetition.",
    affirmation: "So Hum — I am that. I am connected to all that is.",
    guidance: [
      "Sit comfortably with your eyes closed. Take a few natural breaths to settle.",
      "Your mantra for this practice is 'So Hum' (pronounced 'so hum') — Sanskrit for 'I am that.'",
      "Inhale silently repeating 'So' in your mind. Exhale silently repeating 'Hum.'",
      "Let the mantra flow with your breath — not forced, not rushed. Natural and effortless.",
      "If your mind wanders, simply return to the mantra. The mantra is always there waiting for you.",
      "After several minutes, let the mantra fade. Sit in the silence that remains.",
      "Notice the quality of your mind — quieter, more spacious, more present.",
      "Gently open your eyes. Carry this quality of attention into your next activity.",
    ],
    isPremium: true,
  },

  // ─── SLEEP ───────────────────────────────────────────────────────────────────
  {
    id: "sleep-body-release",
    title: "Sleep Preparation",
    subtitle: "Unwind before bed",
    category: "sleep",
    durationMinutes: 20,
    description: "A deeply relaxing progressive muscle relaxation and visualization practice designed to prepare body and mind for deep, restorative sleep.",
    benefit: "Reduces sleep onset time, improves sleep quality, calms an overactive mind",
    icon: "Moon",
    color: "#6366F1",
    colorSecondary: "#8B5CF6",
    soundscape: "rain",
    musicMode: "drone",
    recommendedFrequencyId: "binaural-delta",
    recommendedFrequencyLabel: "Delta Waves (2Hz)",
    frequencyRationale: "Delta binaural beats (2Hz) mirror the brainwave state of deep, dreamless sleep — gently guiding your brain toward the frequency of rest.",
    affirmation: "I release this day completely. I am safe, warm, and deeply at rest.",
    guidance: [
      "Lie in your bed in a comfortable position. Dim or turn off all lights.",
      "Take three slow, deep breaths. With each exhale, let your body become heavier.",
      "Starting with your feet, tense the muscles tightly for 5 seconds — then release completely.",
      "Move up to your calves, thighs, abdomen, hands, arms, shoulders, and face — tense and release each.",
      "Your body is now completely relaxed. Feel the weight of it sinking into your mattress.",
      "Visualize a peaceful place — a quiet beach, a forest clearing, a warm room. Make it vivid.",
      "In this place, there is nothing you need to do. Nowhere to be. Just rest.",
      "Let your thoughts drift like clouds across a night sky — noticing them, not following them.",
      "Allow sleep to come naturally. You are safe. You are at rest. Let go.",
    ],
    isPremium: false,
  },
  {
    id: "yoga-nidra",
    title: "Yoga Nidra",
    subtitle: "Conscious deep sleep",
    category: "sleep",
    durationMinutes: 25,
    description: "Yoga Nidra — 'yogic sleep' — is a state between waking and sleeping that provides the restorative benefits of deep sleep while maintaining a thread of consciousness.",
    benefit: "One hour of Yoga Nidra is said to equal four hours of conventional sleep",
    icon: "Layers",
    color: "#4F46E5",
    colorSecondary: "#7C3AED",
    soundscape: "ocean",
    musicMode: "ambient",
    recommendedFrequencyId: "binaural-theta",
    recommendedFrequencyLabel: "Theta Waves (6Hz)",
    frequencyRationale: "Theta binaural beats (6Hz) correspond to the hypnagogic state between waking and sleeping — the exact state Yoga Nidra cultivates.",
    affirmation: "I am awake in my sleep. I am resting in pure awareness.",
    guidance: [
      "Lie in Savasana — flat on your back, arms slightly away from your body, palms up.",
      "State your Sankalpa (intention) three times mentally: a short, positive affirmation about your life.",
      "Rotation of consciousness: bring your awareness to each body part as it is named — right thumb, index finger, middle finger, ring finger, little finger, palm, back of hand, wrist, forearm, elbow, upper arm, shoulder, armpit, right side of chest...",
      "Continue through the entire left side, then the back body, the front body, and the face.",
      "Pairs of opposites: experience heaviness, then lightness. Cold, then warmth. Pain, then pleasure. Hold each sensation briefly.",
      "Visualization: allow images to arise and pass — a golden sunrise, a still lake, a flickering candle, a vast night sky.",
      "Return to your Sankalpa. State it three times with full feeling and conviction.",
      "Slowly become aware of your physical body and the space around you. Take your time returning.",
    ],
    isPremium: true,
  },

  // ─── HEALING ─────────────────────────────────────────────────────────────────
  {
    id: "loving-kindness",
    title: "Loving-Kindness (Metta)",
    subtitle: "Cultivate compassion",
    category: "healing",
    durationMinutes: 12,
    description: "The ancient Metta meditation practice of directing unconditional love and goodwill first to yourself, then outward to all beings.",
    benefit: "Reduces self-criticism, increases empathy, improves emotional resilience",
    icon: "Heart",
    color: "#EC4899",
    colorSecondary: "#F43F5E",
    soundscape: "forest",
    musicMode: "ambient",
    recommendedFrequencyId: "639hz",
    recommendedFrequencyLabel: "639Hz Connection",
    frequencyRationale: "639Hz opens the Heart Chakra and is specifically associated with harmonizing relationships and cultivating unconditional love — a perfect match for Metta practice.",
    affirmation: "May I be happy. May I be healthy. May I be at peace.",
    guidance: [
      "Sit comfortably with your eyes closed. Place one hand on your heart.",
      "Begin with yourself. Silently repeat: 'May I be happy. May I be healthy. May I be safe. May I live with ease.'",
      "Feel the warmth of these wishes in your chest. You deserve this love as much as anyone.",
      "Now bring to mind someone you love easily — a close friend, a pet, a child. Direct the same phrases to them.",
      "Expand to a neutral person — someone you neither like nor dislike. A neighbor, a stranger. Offer them the same wishes.",
      "Now, if you feel ready, bring to mind someone difficult. Offer them the phrases — not because they deserve it, but because you choose compassion.",
      "Finally, expand your awareness to all beings everywhere — all humans, all creatures. 'May all beings be happy. May all beings be at peace.'",
      "Rest in the warmth of this open heart. This is your natural state.",
    ],
    isPremium: false,
  },
  {
    id: "grief-release",
    title: "Emotional Release & Healing",
    subtitle: "Process and let go",
    category: "healing",
    durationMinutes: 15,
    description: "A gentle, compassionate practice for processing difficult emotions — grief, sadness, anger, or loss — with kindness and without resistance.",
    benefit: "Emotional processing, reduces suppressed tension, cultivates self-compassion",
    icon: "Droplets",
    color: "#0EA5E9",
    colorSecondary: "#3B82F6",
    soundscape: "rain",
    musicMode: "ambient",
    recommendedFrequencyId: "396hz",
    recommendedFrequencyLabel: "396Hz Liberation",
    frequencyRationale: "396Hz is specifically designed to liberate guilt, fear, and grief — it works directly on the emotional body to facilitate release and healing.",
    affirmation: "I allow myself to feel. Feeling is healing. I am safe to let go.",
    guidance: [
      "Find a private, comfortable space where you feel safe. You may lie down or sit.",
      "Take a few breaths and give yourself permission to feel whatever is present — without judgment.",
      "Place one hand on your heart and one on your belly. Feel the warmth of your own touch.",
      "Gently ask: 'What emotion is here right now?' Don't analyze it — just notice where you feel it in your body.",
      "Breathe into that place in your body. Imagine your breath as warm light, softening the sensation.",
      "Say to yourself: 'I see you. I feel you. You are welcome here.' Resistance creates suffering; allowance creates flow.",
      "Let whatever needs to move, move. Tears, sighs, shaking — all are welcome. This is your body healing.",
      "When the wave passes, rest in the quiet that follows. Notice how much lighter you feel.",
      "Place both hands on your heart. Say: 'I am healing. I am whole. I am enough.'",
    ],
    isPremium: true,
  },

  // ─── SPIRITUAL ───────────────────────────────────────────────────────────────
  {
    id: "third-eye",
    title: "Third Eye Activation",
    subtitle: "Deepen your intuition",
    category: "spiritual",
    durationMinutes: 15,
    description: "A focused visualization and breath practice targeting the Ajna (Third Eye) chakra to sharpen intuition, inner vision, and spiritual perception.",
    benefit: "Enhances intuition, improves mental clarity, deepens spiritual connection",
    icon: "Eye",
    color: "#7C3AED",
    colorSecondary: "#A855F7",
    soundscape: "bowl",
    musicMode: "crystal",
    recommendedFrequencyId: "852hz",
    recommendedFrequencyLabel: "852Hz Spiritual Order",
    frequencyRationale: "852Hz is directly associated with the Third Eye Chakra (Ājñā) — it awakens intuition and dissolves illusions, making it the natural companion for this practice.",
    affirmation: "I trust my inner vision. My intuition guides me clearly and truly.",
    guidance: [
      "Sit in a comfortable meditation posture with your spine erect. Close your eyes.",
      "Bring your inner gaze to the point between your eyebrows — the location of the Third Eye.",
      "Breathe slowly and deeply. With each inhale, imagine a deep indigo light gathering at this point.",
      "With each exhale, feel this light expanding, pulsing gently like a slow heartbeat.",
      "If you see colors, shapes, or images — observe them without grasping. They are messages from your deeper mind.",
      "Ask a question you have been sitting with. Don't seek an answer — just hold the question lightly in the space of the Third Eye.",
      "Notice any impressions, feelings, or knowing that arises. Trust what comes, even if it seems subtle.",
      "Slowly bring your awareness back to your breath, then to your body, then to the room.",
      "Journal any insights immediately after this practice — they can fade quickly like dreams.",
    ],
    isPremium: true,
  },
  {
    id: "crown-connection",
    title: "Crown Chakra Connection",
    subtitle: "Connect to universal consciousness",
    category: "spiritual",
    durationMinutes: 20,
    description: "A deep meditation for dissolving the boundary between self and the infinite — connecting to the field of universal consciousness through the Crown Chakra.",
    benefit: "Spiritual awakening, sense of unity, transcendence of ego-mind",
    icon: "Zap",
    color: "#EC4899",
    colorSecondary: "#A855F7",
    soundscape: "silence",
    musicMode: "crystal",
    recommendedFrequencyId: "963hz",
    recommendedFrequencyLabel: "963Hz Divine Consciousness",
    frequencyRationale: "963Hz activates the Crown Chakra and the pineal gland — it is the highest Solfeggio frequency, associated with divine consciousness and universal oneness.",
    affirmation: "I am one with all that is. I am the universe experiencing itself.",
    guidance: [
      "Sit in your most comfortable meditation posture. Let your hands rest open in your lap.",
      "Close your eyes and take several deep, releasing breaths. Let go of any agenda for this session.",
      "Imagine a column of pure white light descending from above, entering through the crown of your head.",
      "This light is warm, intelligent, and loving. It fills your head, your chest, your entire body.",
      "With each breath, feel yourself becoming more light than matter — more awareness than body.",
      "Let the boundaries of your skin soften. Feel yourself expanding outward — into the room, the building, the sky.",
      "There is no separation between you and the space around you. You are the awareness in which all things arise.",
      "Rest here. No doing. No seeking. Just being — vast, open, and at peace.",
      "When you are ready, feel the light condensing back into your body. Feel your feet on the floor. Return slowly.",
    ],
    isPremium: true,
  },
];

export const MEDITATION_CATEGORIES: { id: MeditationCategory | "all"; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "Grid3X3" },
  { id: "morning", label: "Morning", icon: "Sunrise" },
  { id: "stress", label: "Stress Relief", icon: "Wind" },
  { id: "focus", label: "Focus", icon: "Target" },
  { id: "sleep", label: "Sleep", icon: "Moon" },
  { id: "healing", label: "Healing", icon: "Heart" },
  { id: "spiritual", label: "Spiritual", icon: "Sparkles" },
];
