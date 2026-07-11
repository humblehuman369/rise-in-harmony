/**
 * AlarmRinging — full-screen wake experience that actually PLAYS the chosen
 * alarm sound with a progressive fade-in (the brand's core promise).
 *
 * Supports every sound source in the app:
 *   - "frequency": any catalog entry — live DDS synthesis, or the pre-mixed
 *     recorded Schumann sessions (useFrequencyPlayer handles both)
 *   - "user_sound": a Frequency Sound Creator recipe — precision tone plus
 *     looping background layer
 *   - "studio_mix": a saved Sound Studio mix — frequency + music + nature
 * Bioluminescent Depth theme
 */
import { useEffect, useRef, useState } from "react";
import { AlarmClock, BellOff, Moon } from "lucide-react";
import { FREQUENCIES, useFrequencyPlayer, type Frequency } from "@/hooks/useFrequencyPlayer";
import { usePrecisionPlayer, type PrecisionSession } from "@/hooks/usePrecisionPlayer";
import { useBackgroundLayer } from "@/hooks/useBackgroundLayer";
import { useSoundStudio, type NatureSound, type MusicMode } from "@/hooks/useSoundStudio";
import type { BackgroundType } from "@/data/backgroundLoops";

export interface RingingSound {
  type: "frequency" | "user_sound" | "studio_mix";
  /** Catalog frequency id (covers synth + recorded) */
  frequencyId?: string;
  /** Frequency Sound Creator recipe */
  userSound?: {
    name: string;
    freqL: number;
    beatHz: number | null;
    isoRate: number | null;
    isoDuty: number | null;
    waveform: string;
    mode: string;
    toneVolume: number;
    backgroundType: string;
    backgroundKey: string | null;
    backgroundVolume: number;
  };
  /** Saved Sound Studio mix settings */
  studioMix?: {
    name: string;
    frequencyHz: number;
    musicMode: string;
    natureSound: string;
    frequencyVolume: number;
    musicVolume: number;
    natureVolume: number;
  };
}

interface AlarmRingingProps {
  label: string;
  soundName: string;
  sound: RingingSound;
  fadeInMinutes: number;
  onStop: () => void;
  onSnooze: () => void;
}

const FALLBACK_FREQ = FREQUENCIES.find(f => f.id === "432") ?? FREQUENCIES[0];

export default function AlarmRinging({
  label,
  soundName,
  sound,
  fadeInMinutes,
  onStop,
  onSnooze,
}: AlarmRingingProps) {
  const freqPlayer = useFrequencyPlayer();
  const precision = usePrecisionPlayer();
  const background = useBackgroundLayer(() => precision.getAudioContext());
  const studio = useSoundStudio();
  const [fadePct, setFadePct] = useState(0);
  const startedRef = useRef(false);

  // Refs so the fade interval always sees current engine handles
  const enginesRef = useRef({ freqPlayer, precision, background, studio });
  enginesRef.current = { freqPlayer, precision, background, studio };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Target volumes per engine (fade scales toward these)
    const targets = {
      tone: 0.75,
      userTone: sound.userSound?.toneVolume ?? 0.7,
      userBg: sound.userSound?.backgroundVolume ?? 0.35,
    };

    const start = async () => {
      const e = enginesRef.current;
      if (sound.type === "frequency" || !sound.type) {
        const freq: Frequency =
          FREQUENCIES.find(f => f.id === sound.frequencyId) ?? FALLBACK_FREQ;
        e.freqPlayer.setVolume(0.02);
        await e.freqPlayer.playFrequency(freq);
      } else if (sound.type === "user_sound" && sound.userSound) {
        const s = sound.userSound;
        const session: PrecisionSession = {
          freqL: s.freqL,
          waveform: s.waveform as PrecisionSession["waveform"],
          mode: s.mode as PrecisionSession["mode"],
          name: s.name,
          ...(s.beatHz != null ? { beatHz: s.beatHz, freqR: s.freqL + s.beatHz } : {}),
          ...(s.isoRate != null ? { isoRate: s.isoRate } : {}),
          ...(s.isoDuty != null ? { isoDuty: s.isoDuty } : {}),
        };
        e.precision.setVolume(0.02);
        await e.precision.play(session);
        await e.background.startBackground(
          s.backgroundType as BackgroundType,
          s.backgroundKey,
          0.02,
        );
      } else if (sound.type === "studio_mix" && sound.studioMix) {
        const m = sound.studioMix;
        e.studio.setFrequency(m.frequencyHz);
        e.studio.setMusicMode(m.musicMode as MusicMode);
        e.studio.setNatureSound(m.natureSound as NatureSound);
        e.studio.setLayerVolume("frequency", m.frequencyVolume);
        e.studio.setLayerVolume("music", m.musicVolume);
        e.studio.setLayerVolume("nature", m.natureVolume);
        e.studio.setLayerVolume("master", 0.02);
        e.studio.play();
      }
    };
    void start();

    // Progressive fade-in over fadeInMinutes (minimum 15s so it's audible fast)
    const fadeMs = Math.max(fadeInMinutes, 0.25) * 60 * 1000;
    const stepMs = 1500;
    const startedAt = Date.now();

    const fadeTimer = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / fadeMs);
      // ease-out curve: quick early rise, gentle approach to full volume
      const level = Math.max(0.02, 1 - Math.pow(1 - t, 2));
      setFadePct(Math.round(t * 100));
      const e = enginesRef.current;
      if (sound.type === "frequency" || !sound.type) {
        e.freqPlayer.setVolume(level * targets.tone);
      } else if (sound.type === "user_sound") {
        e.precision.setVolume(level * targets.userTone);
        e.background.setBackgroundVolume(level * targets.userBg);
      } else if (sound.type === "studio_mix") {
        e.studio.setLayerVolume("master", level * 0.85);
      }
      if (t >= 1) clearInterval(fadeTimer);
    }, stepMs);

    return () => {
      clearInterval(fadeTimer);
      const e = enginesRef.current;
      e.freqPlayer.stopAudio(true);
      e.precision.stopAudio(true);
      e.background.stopBackground();
      e.studio.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-8"
      style={{ background: "radial-gradient(ellipse at 50% 30%, #12152A 0%, #0A0B14 70%)" }}
    >
      {/* Pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${180 + i * 110}px`,
              height: `${180 + i * 110}px`,
              borderColor: `rgba(0,212,170,${0.16 - i * 0.04})`,
              animation: `frequency-pulse ${2.4 + i * 0.7}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        <AlarmClock size={40} className="mx-auto mb-6 animate-pulse" style={{ color: "#00D4AA" }} />
        <div
          className="text-4xl font-semibold mb-2"
          style={{ fontFamily: "Cormorant Garamond, serif", color: "#E8EDF5" }}
        >
          {label}
        </div>
        <div className="text-sm mb-1" style={{ color: "#8FA3BF", fontFamily: "DM Sans, sans-serif" }}>
          Waking you with <span style={{ color: "#00D4AA" }}>{soundName}</span>
        </div>
        <div className="text-xs mb-10" style={{ color: "#4A5568", fontFamily: "DM Sans, sans-serif" }}>
          {fadePct < 100 ? `Rising gently — ${fadePct}%` : "At full resonance"}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onSnooze}
            className="flex items-center gap-2 px-8 py-4 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "#C084FC",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <Moon size={16} />
            Snooze 5 min
          </button>
          <button
            onClick={onStop}
            className="btn-teal flex items-center gap-2 px-10 py-4 text-sm font-semibold"
          >
            <BellOff size={16} />
            I'm awake
          </button>
        </div>
      </div>
    </div>
  );
}
