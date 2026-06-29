/**
 * useFrequencyPlayer — Web Audio API hook for healing frequency synthesis
 * Generates sine waves at specific Hz values with fade-in/fade-out
 * Supports binaural beats (slightly different L/R channel frequencies)
 */
import { useState, useRef, useCallback, useEffect } from "react";

export interface Frequency {
  id: string;
  name: string;
  hz: number;
  binauralOffset?: number; // Hz offset for right channel (binaural)
  category: "solfeggio" | "binaural" | "chakra" | "nature";
  description: string;
  benefit: string;
  color: string;
  isPremium: boolean;
}

export const FREQUENCIES: Frequency[] = [
  {
    id: "174hz",
    name: "Foundation",
    hz: 174,
    category: "solfeggio",
    description: "174Hz — The Foundation Tone",
    benefit: "Reduces pain, promotes security and grounding",
    color: "#EF4444",
    isPremium: false,
  },
  {
    id: "285hz",
    name: "Quantum Cognition",
    hz: 285,
    category: "solfeggio",
    description: "285Hz — Quantum Cognition",
    benefit: "Heals tissues, influences energy fields",
    color: "#F97316",
    isPremium: true,
  },
  {
    id: "396hz",
    name: "Liberation",
    hz: 396,
    category: "solfeggio",
    description: "396Hz — Root Chakra (Mūlādhāra) · Liberation from Fear",
    benefit: "Grounds your energy and releases guilt, fear, and deeply held negative emotions. Traditionally associated with the Root Chakra, this tone is used to build a sense of safety, stability, and belonging.",
    color: "#EAB308",
    isPremium: false,
  },
  {
    id: "417hz",
    name: "Transmutation",
    hz: 417,
    category: "solfeggio",
    description: "417Hz — Sacral Chakra (Svādhiṣṭhāna) · Transmutation",
    benefit: "Clears traumatic experiences and facilitates positive change. Linked to the Sacral Chakra, it supports creativity, emotional flow, and the release of past patterns that no longer serve you.",
    color: "#84CC16",
    isPremium: true,
  },
  {
    id: "432hz",
    name: "Natural Harmony",
    hz: 432,
    category: "solfeggio",
    description: "432Hz — Natural Harmony",
    benefit: "Aligns with nature's frequency, promotes calm",
    color: "#00D4AA",
    isPremium: false,
  },
  {
    id: "528hz",
    name: "Miracle Tone",
    hz: 528,
    category: "solfeggio",
    description: "528Hz — Solar Plexus Chakra (Maṇipūra) · The Miracle Tone",
    benefit: "Known as the 'Love Frequency,' 528Hz is associated with DNA repair and cellular transformation. Linked to the Solar Plexus Chakra, it strengthens personal power, confidence, and your sense of purpose.",
    color: "#06B6D4",
    isPremium: false,
  },
  {
    id: "639hz",
    name: "Connection",
    hz: 639,
    category: "solfeggio",
    description: "639Hz — Heart Chakra (Anāhata) · Connection & Relationships",
    benefit: "Opens the Heart Chakra to harmonize relationships and deepen compassion. This frequency is used to enhance communication, tolerance, and unconditional love — both for others and for yourself.",
    color: "#3B82F6",
    isPremium: true,
  },
  {
    id: "741hz",
    name: "Awakening",
    hz: 741,
    category: "solfeggio",
    description: "741Hz — Throat Chakra (Viśuddha) · Awakening Intuition",
    benefit: "Activates the Throat Chakra to support authentic self-expression and clear communication. Traditionally used to cleanse cells of electromagnetic toxins and expand consciousness through honest, purposeful speech.",
    color: "#8B5CF6",
    isPremium: true,
  },
  {
    id: "852hz",
    name: "Spiritual Order",
    hz: 852,
    category: "solfeggio",
    description: "852Hz — Third Eye Chakra (Ājñā) · Spiritual Order",
    benefit: "Awakens the Third Eye Chakra, deepening intuition and inner vision. This frequency is used to return to spiritual order, dissolve illusions, and strengthen the connection between your conscious mind and higher awareness.",
    color: "#A855F7",
    isPremium: true,
  },
  {
    id: "963hz",
    name: "Divine Consciousness",
    hz: 963,
    category: "solfeggio",
    description: "963Hz — Crown Chakra (Sahasrāra) · Divine Consciousness",
    benefit: "Activates the Crown Chakra and the pineal gland, opening a channel to higher consciousness and universal oneness. Used in meditation to dissolve the boundary between self and the divine, inviting deep spiritual awakening.",
    color: "#EC4899",
    isPremium: true,
  },
  {
    id: "binaural-alpha",
    name: "Alpha Waves",
    hz: 200,
    binauralOffset: 10,
    category: "binaural",
    description: "Alpha Binaural — 10Hz beat",
    benefit: "Relaxed alertness, creativity, stress reduction",
    color: "#00D4AA",
    isPremium: false,
  },
  {
    id: "binaural-theta",
    name: "Theta Waves",
    hz: 200,
    binauralOffset: 6,
    category: "binaural",
    description: "Theta Binaural — 6Hz beat",
    benefit: "Deep meditation, REM sleep, healing",
    color: "#8B5CF6",
    isPremium: true,
  },
  {
    id: "binaural-delta",
    name: "Delta Waves",
    hz: 200,
    binauralOffset: 2,
    category: "binaural",
    description: "Delta Binaural — 2Hz beat",
    benefit: "Deep sleep, healing, unconscious mind",
    color: "#6366F1",
    isPremium: true,
  },
];

export function useFrequencyPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrequency, setCurrentFrequency] = useState<Frequency | null>(null);
  const [volume, setVolumeState] = useState(0.6);
  const [playTime, setPlayTime] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorLRef = useRef<OscillatorNode | null>(null);
  const oscillatorRRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAudio = useCallback((fadeOut = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!audioCtxRef.current || !gainNodeRef.current) {
      setIsPlaying(false);
      return;
    }
    const ctx = audioCtxRef.current;
    const gain = gainNodeRef.current;
    if (fadeOut) {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => {
        oscillatorLRef.current?.stop();
        oscillatorRRef.current?.stop();
        oscillatorLRef.current = null;
        oscillatorRRef.current = null;
        setIsPlaying(false);
      }, 1200);
    } else {
      oscillatorLRef.current?.stop();
      oscillatorRRef.current?.stop();
      oscillatorLRef.current = null;
      oscillatorRRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const playFrequency = useCallback((freq: Frequency) => {
    // Stop any existing audio
    if (oscillatorLRef.current) {
      oscillatorLRef.current.stop();
      oscillatorLRef.current = null;
    }
    if (oscillatorRRef.current) {
      oscillatorRRef.current.stop();
      oscillatorRRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);

    // Create or resume AudioContext
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setTargetAtTime(volume, ctx.currentTime, 0.5);
    gainNodeRef.current = gainNode;

    if (freq.binauralOffset !== undefined) {
      // Binaural: different freq in each ear
      const merger = ctx.createChannelMerger(2);
      mergerRef.current = merger;

      const oscL = ctx.createOscillator();
      oscL.type = 'sine';
      oscL.frequency.value = freq.hz;
      const splitterL = ctx.createChannelSplitter(1);
      oscL.connect(splitterL);
      splitterL.connect(merger, 0, 0);

      const oscR = ctx.createOscillator();
      oscR.type = 'sine';
      oscR.frequency.value = freq.hz + freq.binauralOffset;
      const splitterR = ctx.createChannelSplitter(1);
      oscR.connect(splitterR);
      splitterR.connect(merger, 0, 1);

      merger.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscL.start();
      oscR.start();
      oscillatorLRef.current = oscL;
      oscillatorRRef.current = oscR;
    } else {
      // Mono sine wave
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq.hz;
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      oscillatorLRef.current = osc;
    }

    setCurrentFrequency(freq);
    setIsPlaying(true);
    setPlayTime(0);

    // Timer for play duration
    timerRef.current = setInterval(() => {
      setPlayTime(t => t + 1);
    }, 1000);
  }, [volume]);

  const togglePlay = useCallback((freq: Frequency) => {
    if (isPlaying && currentFrequency?.id === freq.id) {
      stopAudio();
    } else {
      playFrequency(freq);
    }
  }, [isPlaying, currentFrequency, playFrequency, stopAudio]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(v, audioCtxRef.current.currentTime, 0.1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      oscillatorLRef.current?.stop();
      oscillatorRRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  return {
    isPlaying,
    currentFrequency,
    volume,
    playTime,
    playFrequency,
    stopAudio,
    togglePlay,
    setVolume,
  };
}
