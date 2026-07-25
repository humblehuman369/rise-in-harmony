/**
 * useMeditationPlayer — layered meditation audio engine
 *
 * TrueHz HQ masters (self-contained MP3s on the web host) stream via expo-audio.
 * Legacy/procedural soundscapes still use meditationSynth when no master URL exists.
 *
 * Optional "Sound + Frequency" mode can add a live DDS underlay for procedural
 * beds only — TrueHz masters already contain their frequency and never get a
 * second sine layer (that double-stack sounded distorted/corrupt).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Meditation } from "@rih/shared-types";
import { FREQUENCIES } from "@rih/shared-utils";
import {
  createCatalogVoice,
  getContext,
  getMasterOutput,
  type SynthVoice,
} from "@/lib/synth";
import {
  startNatureSynth,
  startMusicSynth,
  type ProceduralSynthHandle,
} from "@/lib/meditationSynth";
import type { GainNode } from "react-native-audio-api";

const DEFAULT_NATURE_VOLUME = 0.75;
const DEFAULT_MUSIC_VOLUME = 0.45;
const DEFAULT_FREQUENCY_VOLUME = 0.35;

/** Production CDN for TrueHz HQ meditation masters (same files as web). */
const TRUEHZ_MASTER_BASE = "https://www.riseinharmony.com/meditations";

const TRUEHZ_MASTER_URLS: Record<string, string> = {
  "calm-sleep-528": `${TRUEHZ_MASTER_BASE}/calm-sleep-528.mp3`,
  "deep-serenity-444": `${TRUEHZ_MASTER_BASE}/deep-serenity-444.mp3`,
  "nature-meditation-174": `${TRUEHZ_MASTER_BASE}/nature-meditation-174.mp3`,
  "reiki-healing-garden-285": `${TRUEHZ_MASTER_BASE}/reiki-healing-garden-285.mp3`,
  "spiritual-meditation-444": `${TRUEHZ_MASTER_BASE}/spiritual-meditation-444.mp3`,
  "third-eye-activation-528": `${TRUEHZ_MASTER_BASE}/third-eye-activation-528.mp3`,
};

export type MeditationMode = "sound" | "frequency";

function masterUrlFor(med: Meditation): string | null {
  return TRUEHZ_MASTER_URLS[med.soundscape] ?? TRUEHZ_MASTER_URLS[med.id] ?? null;
}

interface MeditationPlayerState {
  isPlaying: boolean;
  /** Seconds elapsed in the current session */
  elapsedSec: number;
  /** Index of the current guidance step */
  stepIndex: number;
  /** True once the full duration has elapsed */
  isComplete: boolean;
  natureVolume: number;
  frequencyVolume: number;
}

export function useMeditationPlayer(meditation: Meditation | null, mode: MeditationMode) {
  const natureSynthRef = useRef<ProceduralSynthHandle | null>(null);
  const natureGainRef = useRef<GainNode | null>(null);
  const musicSynthRef = useRef<ProceduralSynthHandle | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const masterPlayerRef = useRef<AudioPlayer | null>(null);
  const freqVoiceRef = useRef<SynthVoice | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const natureVolRef = useRef(DEFAULT_NATURE_VOLUME);
  const musicVolRef = useRef(DEFAULT_MUSIC_VOLUME);
  const freqVolRef = useRef(DEFAULT_FREQUENCY_VOLUME);
  const isPausedRef = useRef(false);

  const [state, setState] = useState<MeditationPlayerState>({
    isPlaying: false,
    elapsedSec: 0,
    stepIndex: 0,
    isComplete: false,
    natureVolume: DEFAULT_NATURE_VOLUME,
    frequencyVolume: DEFAULT_FREQUENCY_VOLUME,
  });

  const totalSec = (meditation?.durationMinutes ?? 0) * 60;
  const stepCount = meditation?.guidance.length ?? 1;
  const stepDurationSec = Math.max(1, Math.floor(totalSec / stepCount));

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // ─── TrueHz master (remote MP3) ────────────────────────────────────────────

  const stopMasterPlayer = useCallback(() => {
    if (masterPlayerRef.current) {
      try {
        masterPlayerRef.current.pause();
        masterPlayerRef.current.remove();
      } catch {
        /* ignore */
      }
      masterPlayerRef.current = null;
    }
  }, []);

  const startMasterPlayer = useCallback(
    (med: Meditation) => {
      stopMasterPlayer();
      const uri = masterUrlFor(med);
      if (!uri) return false;
      try {
        const p = createAudioPlayer({ uri });
        // Full-length session masters — do not loop (avoids seam/jump at end)
        p.loop = false;
        p.volume = Math.max(0, Math.min(1, natureVolRef.current));
        p.play();
        masterPlayerRef.current = p;
        return true;
      } catch {
        stopMasterPlayer();
        return false;
      }
    },
    [stopMasterPlayer],
  );

  // ─── Nature Layer (Procedural fallback) ────────────────────────────────────

  const stopNatureLayer = useCallback(() => {
    if (natureSynthRef.current) {
      natureSynthRef.current.stop();
      natureSynthRef.current = null;
    }
    if (natureGainRef.current) {
      try {
        natureGainRef.current.disconnect();
      } catch {
        /* ignore */
      }
      natureGainRef.current = null;
    }
  }, []);

  const startNatureLayer = useCallback(
    (med: Meditation) => {
      stopNatureLayer();
      // Prefer TrueHz master stream when available
      if (masterUrlFor(med)) {
        return startMasterPlayer(med);
      }
      const ctx = getContext();
      const masterOutput = getMasterOutput(ctx);
      const synth = startNatureSynth(ctx, med.soundscape);
      if (!synth) return false;
      const volumeGain = ctx.createGain();
      volumeGain.gain.value = natureVolRef.current;
      synth.output.connect(volumeGain);
      volumeGain.connect(masterOutput);
      natureSynthRef.current = synth;
      natureGainRef.current = volumeGain;
      return true;
    },
    [stopNatureLayer, startMasterPlayer],
  );

  // ─── Music Layer (Procedural) ──────────────────────────────────────────────

  const stopMusicLayer = useCallback(() => {
    if (musicSynthRef.current) {
      musicSynthRef.current.stop();
      musicSynthRef.current = null;
    }
    if (musicGainRef.current) {
      try {
        musicGainRef.current.disconnect();
      } catch {
        /* ignore */
      }
      musicGainRef.current = null;
    }
  }, []);

  const startMusicLayer = useCallback(
    (med: Meditation) => {
      stopMusicLayer();
      // TrueHz masters and musicMode "none" need no extra music bed
      if (masterUrlFor(med) || med.musicMode === "none") return;
      const ctx = getContext();
      const masterOutput = getMasterOutput(ctx);
      const synth = startMusicSynth(ctx, med.musicMode);
      if (!synth) return;
      const volumeGain = ctx.createGain();
      volumeGain.gain.value = musicVolRef.current;
      synth.output.connect(volumeGain);
      volumeGain.connect(masterOutput);
      musicSynthRef.current = synth;
      musicGainRef.current = volumeGain;
    },
    [stopMusicLayer],
  );

  // ─── Frequency Layer (DDS) — not used on TrueHz masters ────────────────────

  const startFreqVoice = useCallback((med: Meditation) => {
    // Masters already include the target pitch; a second sine causes beating/distortion
    if (masterUrlFor(med)) return;
    const freq = FREQUENCIES.find((f) => f.id === med.recommendedFrequencyId);
    if (!freq) return;
    const voice = createCatalogVoice(freq, freqVolRef.current);
    voice.start(1.5);
    freqVoiceRef.current = voice;
  }, []);

  const stopFreqVoice = useCallback((fadeOutSec = 0.4) => {
    if (freqVoiceRef.current) {
      freqVoiceRef.current.stop(fadeOutSec);
      freqVoiceRef.current = null;
    }
  }, []);

  const teardownAll = useCallback(() => {
    stopMasterPlayer();
    stopNatureLayer();
    stopMusicLayer();
    stopFreqVoice();
  }, [stopMasterPlayer, stopNatureLayer, stopMusicLayer, stopFreqVoice]);

  const stop = useCallback(
    (markComplete = false) => {
      clearTick();
      teardownAll();
      isPausedRef.current = false;
      KeepAwake.deactivateKeepAwake().catch(() => {});
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isComplete: markComplete ? true : prev.isComplete,
      }));
    },
    [clearTick, teardownAll],
  );

  const pause = useCallback(() => {
    clearTick();
    if (masterPlayerRef.current) {
      try {
        masterPlayerRef.current.pause();
      } catch {
        /* ignore */
      }
    } else {
      // Procedural layers can't pause — tear down (recreated on resume)
      teardownAll();
    }
    isPausedRef.current = true;
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearTick, teardownAll]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      setState((prev) => {
        const next = prev.elapsedSec + 1;
        if (next >= totalSec) {
          setTimeout(() => stop(true), 0);
          return { ...prev, elapsedSec: totalSec, stepIndex: stepCount - 1 };
        }
        return {
          ...prev,
          elapsedSec: next,
          stepIndex: Math.min(Math.floor(next / stepDurationSec), stepCount - 1),
        };
      });
    }, 1000);
  }, [clearTick, totalSec, stepCount, stepDurationSec, stop]);

  const play = useCallback(async () => {
    if (!meditation) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    // Resume paused TrueHz master without reloading the stream
    if (isPausedRef.current && masterPlayerRef.current) {
      try {
        masterPlayerRef.current.play();
      } catch {
        startMasterPlayer(meditation);
      }
    } else if (!masterPlayerRef.current && !natureSynthRef.current) {
      startNatureLayer(meditation);
    }

    if (!musicSynthRef.current) {
      startMusicLayer(meditation);
    }

    if (mode === "frequency" && !freqVoiceRef.current) {
      startFreqVoice(meditation);
    }

    isPausedRef.current = false;
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    startTick();
    setState((prev) => ({ ...prev, isPlaying: true, isComplete: false }));
  }, [
    meditation,
    mode,
    startTick,
    startFreqVoice,
    startNatureLayer,
    startMusicLayer,
    startMasterPlayer,
  ]);

  const setNatureVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    natureVolRef.current = clamped;
    if (masterPlayerRef.current) {
      masterPlayerRef.current.volume = clamped;
    }
    if (natureGainRef.current) {
      const ctx = getContext();
      natureGainRef.current.gain.linearRampToValueAtTime(
        clamped,
        ctx.currentTime + 0.05,
      );
    }
    setState((prev) => ({ ...prev, natureVolume: clamped }));
  }, []);

  const setFrequencyVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    freqVolRef.current = clamped;
    freqVoiceRef.current?.setVolume(clamped);
    setState((prev) => ({ ...prev, frequencyVolume: clamped }));
  }, []);

  useEffect(() => {
    if (!state.isPlaying || !meditation) return;
    if (mode === "frequency" && !freqVoiceRef.current) {
      startFreqVoice(meditation);
    } else if (mode === "sound" && freqVoiceRef.current) {
      stopFreqVoice(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    return () => {
      clearTick();
      teardownAll();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [meditation?.id, clearTick, teardownAll]);

  return {
    ...state,
    totalSec,
    play,
    pause,
    stop,
    setNatureVolume,
    setFrequencyVolume,
  };
}
