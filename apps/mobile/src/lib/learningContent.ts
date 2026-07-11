/**
 * Rise In Harmony — Learning Content
 * Shared journey data for the Learn section (mobile).
 * Mirrors client/src/data/learningContent.ts without web-specific imports.
 */

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

export const JOURNEYS: Journey[] = [
  {
    id: "foundation",
    title: "The Foundation",
    subtitle: "Solfeggio & Extended Tones",
    description:
      "The ancient Solfeggio scale and its extended tones form the bedrock of frequency therapy. These pure tones are traditionally associated with emotional release, cellular healing, and foundational energetic alignment.",
    themeColor: "#00D4AA",
    iconType: "sparkles",
    entries: [
      {
        id: "174",
        name: "174 Hz — Foundation",
        hz: 174,
        description: "174Hz — The deepest extended Solfeggio tone.",
        benefit:
          "174 Hz is the lowest of the extended Solfeggio tones and is associated with a deep sense of safety and security. It is thought to act as a natural anaesthetic, reducing pain and tension in the physical body while encouraging the nervous system to release chronic stress patterns held at the cellular level.",
        color: "#6B7A99",
        isPremium: false,
      },
      {
        id: "285",
        name: "285 Hz — Quantum Cognition",
        hz: 285,
        description: "285Hz — Quantum Cognition.",
        benefit:
          "285 Hz is associated with tissue regeneration and the restoration of energetic fields. It is thought to influence the body's morphic field — the blueprint that guides cellular repair — encouraging damaged or depleted tissues to return to their optimal state.",
        color: "#8B5CF6",
        isPremium: false,
      },
      {
        id: "396",
        name: "396 Hz — Liberation",
        hz: 396,
        description: "396Hz — Root Chakra (Mūlādhāra).",
        benefit:
          "396 Hz is the first tone of the classical Solfeggio scale and resonates with the Root Chakra (Mūlādhāra). It is traditionally used to release guilt, fear, and the deep-seated survival anxieties that keep us contracted. Listening to this frequency is said to help dissolve the subconscious blocks that prevent us from feeling safe and grounded in the world.",
        color: "#EF4444",
        isPremium: false,
      },
      {
        id: "417",
        name: "417 Hz — Transmutation",
        hz: 417,
        description: "417Hz — Sacral Chakra (Svādhiṣṭhāna).",
        benefit:
          "417 Hz resonates with the Sacral Chakra (Svādhiṣṭhāna) and is associated with undoing negative situations and facilitating change. It is said to cleanse traumatic experiences from the cellular memory, dissolve crystallised emotional patterns, and restore the natural flow of creative and sexual energy.",
        color: "#F97316",
        isPremium: false,
      },
      {
        id: "528",
        name: "528 Hz — Miracle Tone",
        hz: 528,
        description: "528Hz — Solar Plexus Chakra (Maṇipūra) / The Miracle Tone.",
        benefit:
          "528 Hz — the so-called \"Miracle Tone\" — resonates with the Solar Plexus Chakra (Maṇipūra) and is one of the most widely studied Solfeggio frequencies. It is associated with DNA repair, transformation, and the activation of personal power. Some researchers suggest it may interact with the hydrogen bonds in DNA, though these claims remain outside mainstream science.",
        color: "#F59E0B",
        isPremium: false,
      },
      {
        id: "639",
        name: "639 Hz — Connection",
        hz: 639,
        description: "639Hz — Heart Chakra (Anāhata).",
        benefit:
          "639 Hz resonates with the Heart Chakra (Anāhata) and is associated with harmonising relationships, deepening empathy, and restoring communication between people. It is said to raise the vibration of interpersonal connections, helping to heal old wounds, dissolve resentment, and create an atmosphere of tolerance and understanding.",
        color: "#22C55E",
        isPremium: false,
      },
      {
        id: "741",
        name: "741 Hz — Awakening",
        hz: 741,
        description: "741Hz — Throat Chakra (Viśuddha).",
        benefit:
          "741 Hz resonates with the Throat Chakra (Viśuddha) and is associated with the awakening of intuition and the expansion of consciousness. It is said to help cleanse the cells of toxins and electromagnetic radiation, support problem-solving, and encourage the expression of authentic truth.",
        color: "#3B82F6",
        isPremium: false,
      },
      {
        id: "852",
        name: "852 Hz — Spiritual Order",
        hz: 852,
        description: "852Hz — Third Eye Chakra (Ājñā).",
        benefit:
          "852 Hz resonates with the Third Eye Chakra (Ājñā) and is associated with returning to spiritual order and awakening intuition. It is said to help dissolve illusions, replace negative thoughts with positive ones, and open the inner eye to higher levels of perception beyond ordinary sensory experience.",
        color: "#8B5CF6",
        isPremium: false,
      },
      {
        id: "963",
        name: "963 Hz — Crown",
        hz: 963,
        description: "963Hz — Crown Chakra (Sahasrāra).",
        benefit:
          "963 Hz is the highest of the classical Solfeggio tones and resonates with the Crown Chakra (Sahasrāra). It is associated with the activation of the pineal gland, the awakening of pure consciousness, and a direct experience of unity with the divine. This frequency is said to reconnect us to the original, perfect state of being.",
        color: "#EC4899",
        isPremium: false,
      },
    ],
  },
  {
    id: "mind",
    title: "The Mind",
    subtitle: "Brainwave Entrainment",
    description:
      "Brainwave entrainment uses precisely tuned binaural beats and isochronic tones to guide the brain into specific frequency states — from deep delta sleep to sharp gamma insight. Each entry in this journey targets a distinct neural rhythm.",
    themeColor: "#8B5CF6",
    iconType: "brain",
    entries: [
      {
        id: "delta",
        name: "Delta — Deep Sleep",
        hz: 200,
        binauralOffset: 2,
        description: "Binaural beat: 2 Hz — Deep Sleep & Restoration.",
        benefit:
          "Delta waves (0.5–4 Hz) are the slowest brainwave state and dominate during deep, dreamless sleep. Entraining to delta is associated with profound physical restoration, growth hormone release, immune system strengthening, and the processing of deep emotional material. This is the frequency of complete surrender and renewal.",
        color: "#1E40AF",
        isPremium: false,
      },
      {
        id: "theta",
        name: "Theta — Meditation",
        hz: 200,
        binauralOffset: 6,
        description: "Binaural beat: 6 Hz — Deep Meditation & Creativity.",
        benefit:
          "Theta waves (4–8 Hz) are associated with the hypnagogic state between waking and sleep — the realm of vivid imagery, creative insight, and deep meditation. Shamanic journeys, lucid dreaming, and spontaneous creative breakthroughs often occur in theta. This frequency is a gateway to the subconscious mind.",
        color: "#5B21B6",
        isPremium: false,
      },
      {
        id: "alpha",
        name: "Alpha — Relaxed Focus",
        hz: 200,
        binauralOffset: 10,
        description: "Binaural beat: 10 Hz — Relaxed Alertness & Flow.",
        benefit:
          "Alpha waves (8–13 Hz) represent the brain's natural resting state — calm, alert, and open. Athletes call this the \"zone\"; meditators call it presence. Alpha entrainment is associated with reduced anxiety, improved mood, enhanced creativity, and the effortless absorption of new information.",
        color: "#2563EB",
        isPremium: false,
      },
      {
        id: "alpha-isochronic",
        name: "Alpha Isochronic",
        hz: 200,
        isIsochronic: true,
        description: "Isochronic tone: 10 Hz — Alpha (no headphones required).",
        benefit:
          "An isochronic version of the 10 Hz alpha entrainment frequency. Unlike binaural beats, isochronic tones use a single channel and do not require headphones, making them suitable for use through speakers. The rhythmic pulsing of the tone guides the brain toward the calm, alert alpha state.",
        color: "#0EA5E9",
        isPremium: true,
      },
      {
        id: "beta-focus",
        name: "Beta — Focus",
        hz: 200,
        binauralOffset: 20,
        description: "Binaural beat: 20 Hz — Active Focus & Concentration.",
        benefit:
          "Beta waves (13–30 Hz) are the dominant rhythm of the waking, thinking mind. Entraining to beta supports sustained attention, logical analysis, and active problem-solving. This frequency is useful for study, work, and any task requiring sharp, sequential thinking.",
        color: "#0891B2",
        isPremium: true,
      },
      {
        id: "gamma-insight",
        name: "Gamma — Insight",
        hz: 200,
        binauralOffset: 40,
        description: "Binaural beat: 40 Hz — Gamma Insight & Peak Cognition.",
        benefit:
          "Gamma waves (30–100 Hz) are the fastest brainwave state and are associated with peak cognitive performance, heightened perception, and moments of sudden insight. Research suggests that 40 Hz gamma activity is linked to the binding of sensory information into unified conscious experience — the neural signature of \"aha\" moments.",
        color: "#7C3AED",
        isPremium: true,
      },
    ],
  },
  {
    id: "body",
    title: "The Body",
    subtitle: "Meridian & Rife Frequencies",
    description:
      "Traditional Chinese Medicine maps the body's vital energy (Qi) through a network of meridians, each associated with an organ system and a specific resonant frequency. This journey explores those tones alongside selected Rife frequencies used in bioelectromagnetic research.",
    themeColor: "#F59E0B",
    iconType: "activity",
    entries: [
      {
        id: "meridian-lung",
        name: "Lung Meridian",
        hz: 220,
        description: "220 Hz — Lung Meridian (Grief & Letting Go).",
        benefit:
          "The Lung meridian governs respiration, the skin, and the body's relationship with grief and loss. Its resonant frequency is associated with releasing held sorrow, opening the chest, and restoring the capacity for deep, nourishing breath. In TCM, the lungs are said to hold unprocessed grief — this tone invites its release.",
        color: "#E0F2FE",
        isPremium: true,
      },
      {
        id: "meridian-stomach",
        name: "Stomach Meridian",
        hz: 110,
        description: "110 Hz — Stomach Meridian (Nourishment & Stability).",
        benefit:
          "The Stomach meridian governs digestion, nourishment, and the capacity to \"digest\" life experiences. Its frequency is associated with grounding anxious energy, settling the nervous system, and restoring a sense of stability and belonging. In TCM, worry and overthinking are said to deplete the stomach — this tone supports its restoration.",
        color: "#FEF9C3",
        isPremium: true,
      },
      {
        id: "meridian-heart",
        name: "Heart Meridian",
        hz: 250,
        description: "250 Hz — Heart Meridian (Joy & Consciousness).",
        benefit:
          "The Heart meridian is the emperor of the organ system in TCM, governing consciousness, spirit (Shen), and the capacity for joy. Its frequency is associated with opening the heart, calming the mind, and restoring the natural radiance of joyful presence. Disharmony in the heart meridian is said to manifest as anxiety, insomnia, and disconnection.",
        color: "#FEE2E2",
        isPremium: true,
      },
      {
        id: "meridian-kidney",
        name: "Kidney Meridian",
        hz: 319.88,
        description: "319.88 Hz — Kidney Meridian (Vitality & Will).",
        benefit:
          "The Kidney meridian is the root of all Yin and Yang in the body, governing vitality, willpower, and the body's deepest reserves of energy (Jing). Its frequency is associated with restoring depleted energy, strengthening the will, and reconnecting with the primal life force that underlies all physical and mental activity.",
        color: "#DBEAFE",
        isPremium: true,
      },
      {
        id: "meridian-liver",
        name: "Liver Meridian",
        hz: 317.83,
        description: "317.83 Hz — Liver Meridian (Vision & Smooth Flow).",
        benefit:
          "The Liver meridian governs the smooth flow of Qi throughout the body, the health of the tendons and eyes, and the emotional quality of anger and frustration. Its frequency is associated with releasing stagnant energy, restoring creative vision, and allowing life force to move freely through the body without obstruction.",
        color: "#DCFCE7",
        isPremium: true,
      },
      {
        id: "rife-20",
        name: "Rife 20 Hz",
        hz: 20,
        description: "20 Hz — Rife Protocol (Baseline Vitality).",
        benefit:
          "20 Hz is one of the foundational frequencies in Royal Raymond Rife's original bioelectromagnetic research. It sits at the boundary between the infrasonic and audible ranges and is associated with stimulating baseline cellular vitality and nervous system tone. Note: Rife frequency claims are not validated by mainstream medicine.",
        color: "#A3E635",
        isPremium: true,
      },
    ],
  },
  {
    id: "cosmos",
    title: "The Cosmos",
    subtitle: "Planetary & Angelic",
    description:
      "Long before modern science mapped the solar system, ancient philosophers spoke of the \"Music of the Spheres\" — the idea that each planet, as it moves through its orbit, produces a unique resonant tone. Today, researchers have translated those orbital periods into precise acoustic frequencies, giving us a set of tones that serve as sonic archetypes for the qualities each planet has long represented. Working with these frequencies is an invitation to harmonise your inner world with the rhythms of the cosmos — to feel the warmth of the Sun, the intuitive pull of the Moon, and the expansive wisdom of Jupiter, all through sound.",
    themeColor: "#3B82F6",
    iconType: "compass",
    entries: [
      {
        id: "schumann",
        name: "Schumann Resonance",
        hz: 200,
        binauralOffset: 7.83,
        description: "Binaural beat: 7.83 Hz — Earth's Heartbeat.",
        benefit:
          "The Schumann Resonance is the electromagnetic frequency of Earth's ionospheric cavity — approximately 7.83 Hz. Often called the \"Earth's heartbeat\", it sits in the theta/alpha boundary and is associated with grounding, synchronisation of biological rhythms, and a felt sense of connection to the living planet. Delivered here as a binaural beat.",
        color: "#10B981",
        isPremium: false,
      },
      {
        id: "planet-sun",
        name: "Sun",
        hz: 126.22,
        description: "126.22 Hz — Vitality & Inner Radiance.",
        benefit:
          "The Sun's frequency brings vitality, confidence, and inner radiance. It helps restore life force and align you with your true self — the solar principle of conscious identity, creative power, and the will to shine.",
        color: "#F59E0B",
        isPremium: true,
      },
      {
        id: "planet-moon",
        name: "Moon",
        hz: 210.42,
        description: "210.42 Hz — Emotional Balance & Intuition.",
        benefit:
          "The Moon's frequency encourages emotional balance, intuition, and reflective awareness. It is ideal for meditation, rest, and inner healing — supporting the lunar qualities of receptivity, cyclical wisdom, and trust in the quiet voice of intuition.",
        color: "#E8EDF5",
        isPremium: true,
      },
      {
        id: "planet-mercury",
        name: "Mercury",
        hz: 141.27,
        description: "141.27 Hz — Focus & Communication.",
        benefit:
          "Mercury's frequency sharpens the mind and opens the channels of clear communication. It is a tone for focused thinking, articulate expression, and the swift, agile processing of ideas.",
        color: "#06B6D4",
        isPremium: true,
      },
      {
        id: "planet-venus",
        name: "Venus",
        hz: 221.23,
        description: "221.23 Hz — Love & Harmony.",
        benefit:
          "Venus's frequency opens the heart to love in all its forms — romantic, compassionate, and self-directed. It cultivates inner harmony, a sense of beauty, and a gentle acceptance of yourself and others.",
        color: "#F472B6",
        isPremium: true,
      },
      {
        id: "planet-earth",
        name: "Earth",
        hz: 194.71,
        description: "194.71 Hz — Grounding & Balance.",
        benefit:
          "Earth's orbital frequency brings you back to the present moment and into your body. It is a tone for stability, deep grounding, and restoring the natural balance between your inner and outer worlds.",
        color: "#22C55E",
        isPremium: true,
      },
      {
        id: "planet-mars",
        name: "Mars",
        hz: 144.72,
        description: "144.72 Hz — Energy & Courage.",
        benefit:
          "Mars's frequency ignites the fire of motivation and courageous action. It is a tone for overcoming inertia, building physical vitality, and channelling raw energy into purposeful, forward movement.",
        color: "#EF4444",
        isPremium: true,
      },
      {
        id: "planet-jupiter",
        name: "Jupiter",
        hz: 183.58,
        description: "183.58 Hz — Growth & Wisdom.",
        benefit:
          "Jupiter's frequency expands your perspective and opens you to abundance. It is a tone for optimism, higher learning, and the generous wisdom that comes from seeing life as a journey of continuous growth.",
        color: "#F97316",
        isPremium: true,
      },
      {
        id: "planet-saturn",
        name: "Saturn",
        hz: 147.85,
        description: "147.85 Hz — Structure & Discipline.",
        benefit:
          "Saturn's frequency builds the inner architecture of lasting achievement. It is a tone for patience, focused discipline, and the quiet strength that comes from honouring your commitments over time.",
        color: "#A78BFA",
        isPremium: true,
      },
      {
        id: "planet-uranus",
        name: "Uranus",
        hz: 207.36,
        description: "207.36 Hz — Innovation & Freedom.",
        benefit:
          "Uranus's frequency catalyses breakthroughs and liberates the mind from old patterns. It is a tone for radical innovation, personal freedom, and the exhilarating energy of transformation.",
        color: "#38BDF8",
        isPremium: true,
      },
      {
        id: "planet-neptune",
        name: "Neptune",
        hz: 211.44,
        description: "211.44 Hz — Spiritual Awareness & Compassion.",
        benefit:
          "Neptune's frequency dissolves boundaries and deepens spiritual awareness. It is a tone for compassion, imaginative dreaming, and the subtle, transcendent knowing that lives beyond ordinary thought.",
        color: "#818CF8",
        isPremium: true,
      },
      {
        id: "planet-pluto",
        name: "Pluto",
        hz: 140.25,
        description: "140.25 Hz — Rebirth & Deep Healing.",
        benefit:
          "Pluto's frequency works at the deepest level of the psyche, supporting profound transformation and renewal. It is a tone for releasing what no longer serves you and emerging, renewed, from the process of deep inner healing.",
        color: "#C084FC",
        isPremium: true,
      },
      {
        id: "angel-111",
        name: "Alignment",
        hz: 111,
        description: "111 Hz — Alignment & Manifestation.",
        benefit:
          "A symbolic frequency associated with divine order, new beginnings, and bringing intentions into reality.",
        color: "#EC4899",
        isPremium: true,
      },
      {
        id: "angel-333",
        name: "Support",
        hz: 333,
        description: "333 Hz — Support & Expression.",
        benefit:
          "A symbolic frequency associated with protection, guidance, and the courage to express your authentic self.",
        color: "#A855F7",
        isPremium: true,
      },
      {
        id: "angel-888",
        name: "Abundance",
        hz: 888,
        description: "888 Hz — Abundance & Flow.",
        benefit:
          "A symbolic frequency associated with infinite potential, financial flow, and energetic completion.",
        color: "#F97316",
        isPremium: true,
      },
    ],
  },
];
