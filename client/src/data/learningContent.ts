import { type Frequency } from "@/hooks/useFrequencyPlayer";

export interface JourneyEntry {
  id: string;
  name: string;
  hz: number;
  binauralOffset?: number;
  isIsochronic?: boolean;
  description: string;
  benefit: string;
  color: string;
  isPremium: boolean;
}

export interface Journey {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  themeColor: string;
  iconType: "sparkles" | "brain" | "activity" | "compass";
  entries: JourneyEntry[];
}

// Convert a JourneyEntry to a playable Frequency object for useFrequencyPlayer
export function toPlayableFrequency(entry: JourneyEntry, category: Frequency["category"] = "nature"): Frequency {
  return {
    id: entry.id,
    name: entry.name,
    hz: entry.hz,
    binauralOffset: entry.binauralOffset,
    isIsochronic: entry.isIsochronic,
    category,
    description: entry.description,
    benefit: entry.benefit,
    color: entry.color,
    isPremium: entry.isPremium,
  };
}

export const JOURNEYS: Journey[] = [
  {
    id: "foundation",
    title: "The Foundation",
    subtitle: "Solfeggio & Extended Tones",
    description: "The ancient Solfeggio scale and its extended tones form the bedrock of frequency therapy. These pure tones are traditionally associated with emotional release, cellular healing, and foundational energetic alignment.",
    themeColor: "#00D4AA",
    iconType: "sparkles",
    entries: [
      {
        id: "174hz",
        name: "Relief & Stability",
        hz: 174,
        description: "174Hz — The deepest extended Solfeggio tone.",
        benefit: "Reduces pain and promotes a profound sense of security and cellular healing.",
        color: "#EF4444",
        isPremium: false,
      },
      {
        id: "285hz",
        name: "Regeneration & Vitality",
        hz: 285,
        description: "285Hz — Quantum Cognition.",
        benefit: "Associated with the rapid healing of tissues and the restoration of energetic blueprints.",
        color: "#F97316",
        isPremium: true,
      },
      {
        id: "396hz",
        name: "Release & Grounding",
        hz: 396,
        description: "396Hz — Root Chakra (Mūlādhāra).",
        benefit: "Liberates energy by releasing deeply held fear, guilt, and anxiety, anchoring you to the present moment.",
        color: "#EAB308",
        isPremium: false,
      },
      {
        id: "417hz",
        name: "Renewal & Change",
        hz: 417,
        description: "417Hz — Sacral Chakra (Svādhiṣṭhāna).",
        benefit: "Clears traumatic experiences and facilitates positive change by unblocking creative and emotional flow.",
        color: "#84CC16",
        isPremium: true,
      },
      {
        id: "528hz",
        name: "Love & Healing",
        hz: 528,
        description: "528Hz — Solar Plexus Chakra (Maṇipūra) / The Miracle Tone.",
        benefit: "Strengthens personal power and purpose. Traditionally known as the 'Love Frequency' for its restorative properties.",
        color: "#06B6D4",
        isPremium: false,
      },
      {
        id: "639hz",
        name: "Connection & Harmony",
        hz: 639,
        description: "639Hz — Heart Chakra (Anāhata).",
        benefit: "Opens the heart to enhance communication, tolerance, and unconditional love in relationships.",
        color: "#3B82F6",
        isPremium: true,
      },
      {
        id: "741hz",
        name: "Cleansing & Expression",
        hz: 741,
        description: "741Hz — Throat Chakra (Viśuddha).",
        benefit: "Purifies the mind and body, empowering you to speak your truth with clarity and confidence.",
        color: "#8B5CF6",
        isPremium: true,
      },
      {
        id: "852hz",
        name: "Intuition & Awakening",
        hz: 852,
        description: "852Hz — Third Eye Chakra (Ājñā).",
        benefit: "Awakens inner guidance, dissolving illusions and returning you to spiritual order.",
        color: "#A855F7",
        isPremium: true,
      },
      {
        id: "963hz",
        name: "Awakening & Unity",
        hz: 963,
        description: "963Hz — Crown Chakra (Sahasrāra).",
        benefit: "The highest Solfeggio tone, connecting you to divine consciousness and universal unity.",
        color: "#EC4899",
        isPremium: true,
      },
    ],
  },
  {
    id: "mind",
    title: "The Mind",
    subtitle: "Brainwave States",
    description: "Brainwave entrainment uses rhythmic audio (binaural beats or isochronic pulses) to gently guide the brain into specific states of consciousness, from deep restorative sleep to hyper-focused flow.",
    themeColor: "#3B82F6",
    iconType: "brain",
    entries: [
      {
        id: "binaural-delta",
        name: "Delta (0.5–4 Hz)",
        hz: 200,
        binauralOffset: 3,
        description: "Delta Binaural — 3Hz beat (Headphones required).",
        benefit: "Deep Healing & Restoration. The slowest brainwaves, dominant during dreamless sleep, crucial for physical healing and immune system reset.",
        color: "#6366F1",
        isPremium: true,
      },
      {
        id: "binaural-theta",
        name: "Theta (4–8 Hz)",
        hz: 200,
        binauralOffset: 6,
        description: "Theta Binaural — 6Hz beat (Headphones required).",
        benefit: "Intuition & Creativity. The gateway to the subconscious, ideal for deep meditation, vivid imagery, and profound emotional processing.",
        color: "#8B5CF6",
        isPremium: true,
      },
      {
        id: "binaural-alpha",
        name: "Alpha (8–12 Hz)",
        hz: 200,
        binauralOffset: 10,
        description: "Alpha Binaural — 10Hz beat (Headphones required).",
        benefit: "Calm Focus & Clarity. The resting state of the awake brain, promoting relaxed alertness, stress reduction, and a bridge between conscious and subconscious.",
        color: "#00D4AA",
        isPremium: false,
      },
      {
        id: "alpha-isochronic",
        name: "Alpha Isochronic",
        hz: 10,
        isIsochronic: true,
        description: "Alpha Isochronic — 10Hz pulse.",
        benefit: "Focused clarity and relaxed alertness. Isochronic tones work without headphones, making them perfect for ambient room listening.",
        color: "#F59E0B",
        isPremium: true,
      },
      {
        id: "beta-focus",
        name: "Beta (12–30 Hz)",
        hz: 200,
        binauralOffset: 18,
        description: "Beta Binaural — 18Hz beat (Headphones required).",
        benefit: "Focus & Productivity. The active, engaged state of mind. Ideal for complex problem-solving, studying, and sustained attention.",
        color: "#EF4444",
        isPremium: true,
      },
      {
        id: "gamma-insight",
        name: "Gamma (30–100 Hz)",
        hz: 200,
        binauralOffset: 40,
        description: "Gamma Binaural — 40Hz beat (Headphones required).",
        benefit: "Insight & Integration. The fastest brainwaves, associated with moments of sudden insight, peak concentration, and high-level information processing.",
        color: "#EC4899",
        isPremium: true,
      },
    ],
  },
  {
    id: "body",
    title: "The Body",
    subtitle: "Traditional Resonance",
    description: "Historical and traditional frameworks, including Meridian associations, map specific acoustic frequencies to physical systems and energy pathways, offering a symbolic approach to body-aware meditation.",
    themeColor: "#EF4444",
    iconType: "activity",
    entries: [
      {
        id: "meridian-lung",
        name: "Lung Meridian",
        hz: 2287,
        description: "2287 Hz — Breath & Renewal.",
        benefit: "Traditionally associated with expanding life force, releasing grief, and restoring vitality through deeper breathing.",
        color: "#F97316",
        isPremium: true,
      },
      {
        id: "meridian-stomach",
        name: "Stomach Meridian",
        hz: 126.9,
        description: "126.9 Hz — Calm & Stability.",
        benefit: "Associated with soothing worry, supporting digestion, and grounding emotional energy.",
        color: "#EAB308",
        isPremium: true,
      },
      {
        id: "meridian-heart",
        name: "Heart Meridian",
        hz: 289,
        description: "289 Hz — Love & Harmony.",
        benefit: "Traditionally used to open the heart to joy, compassion, and balanced emotional flow.",
        color: "#EF4444",
        isPremium: true,
      },
      {
        id: "meridian-kidney",
        name: "Kidney Meridian",
        hz: 383.7,
        description: "383.7 Hz — Strength & Courage.",
        benefit: "Associated with recharging core energy, restoring balance, and releasing fear.",
        color: "#3B82F6",
        isPremium: true,
      },
      {
        id: "meridian-liver",
        name: "Liver Meridian",
        hz: 1032,
        description: "1032 Hz — Detox & Flow.",
        benefit: "Traditionally linked to promoting cleansing, relieving irritability, and supporting smooth emotional energy.",
        color: "#84CC16",
        isPremium: true,
      },
      {
        id: "rife-20",
        name: "Lymph Flow (Traditional)",
        hz: 20,
        description: "20 Hz — Historical resonance frequency.",
        benefit: "Historically referenced for stimulating detox pathways and supporting immune strength.",
        color: "#06B6D4",
        isPremium: true,
      },
    ],
  },
  {
    id: "cosmos",
    title: "The Cosmos",
    subtitle: "Planetary & Angelic",
    description: "Frequencies derived from planetary orbits and symbolic numerology. These tones provide an affirmational, motivational, and archetypal framework for deeper spiritual journeys.",
    themeColor: "#8B5CF6",
    iconType: "compass",
    entries: [
      {
        id: "schumann",
        name: "Earth (Schumann)",
        hz: 200,
        binauralOffset: 7.83,
        description: "7.83Hz Binaural — The Earth's heartbeat.",
        benefit: "Promotes grounding, relaxation, and alignment with the Earth's natural electromagnetic rhythm.",
        color: "#22C55E",
        isPremium: true,
      },
      {
        id: "planet-sun",
        name: "Sun",
        hz: 126.22,
        description: "126.22 Hz — Vitality & Purpose.",
        benefit: "An archetypal frequency for energy, motivation, and illuminating your core purpose.",
        color: "#F59E0B",
        isPremium: true,
      },
      {
        id: "planet-moon",
        name: "Moon",
        hz: 210.42,
        description: "210.42 Hz — Emotion & Intuition.",
        benefit: "An archetypal frequency for connecting with emotional depths, intuition, and cyclical rhythms.",
        color: "#E8EDF5",
        isPremium: true,
      },
      {
        id: "planet-mercury",
        name: "Mercury",
        hz: 141.27,
        description: "141.27 Hz — Focus & Communication.",
        benefit: "An archetypal frequency for mental agility, clear expression, and rapid processing.",
        color: "#06B6D4",
        isPremium: true,
      },
      {
        id: "angel-111",
        name: "Alignment",
        hz: 111,
        description: "111 Hz — Alignment & Manifestation.",
        benefit: "A symbolic frequency associated with divine order, new beginnings, and bringing intentions into reality.",
        color: "#EC4899",
        isPremium: true,
      },
      {
        id: "angel-333",
        name: "Support",
        hz: 333,
        description: "333 Hz — Support & Expression.",
        benefit: "A symbolic frequency associated with protection, guidance, and the courage to express your authentic self.",
        color: "#A855F7",
        isPremium: true,
      },
      {
        id: "angel-888",
        name: "Abundance",
        hz: 888,
        description: "888 Hz — Abundance & Flow.",
        benefit: "A symbolic frequency associated with infinite potential, financial flow, and energetic completion.",
        color: "#F97316",
        isPremium: true,
      },
    ],
  },
];
