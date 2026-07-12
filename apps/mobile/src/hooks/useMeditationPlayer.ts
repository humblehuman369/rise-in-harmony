/**
 * useMeditationPlayer — layered meditation audio engine (procedural synthesis)
 *
 * Up to three concurrent layers, all using the DDS engine (react-native-audio-api):
 *   1. Nature soundscape — procedural synthesis via meditationSynth (never loops)
 *   2. Music bed — procedural synthesis via meditationSynth (never loops)
 *   3. Optional healing-frequency underlay — live oscillator synthesis (exact Hz)
 *
 * This replaces the previous expo-audio approach that looped short MP3 files,
 * which caused an audible seam at the loop point. The procedural engine generates
 * endless, evolving textures with no repetition.
 *
 * Plus a 1-second session timer that:
 *   - advances the guidance script (equal time slices across the duration)
 *   - auto-stops the session when the meditation duration is reached
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { setAudioModeAsync } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Meditation, MusicMode } from "@rih/shared-types";
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

const DEFAULT_NATURE_VOLUME = 0.6;
const DEFAULT_MUSIC_VOLUME = 0.45;
const DEFAULT_FREQUENCY_VOLUME = 0.35;

export type MeditationMode = "sound" | "frequency";

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
  const freqVoiceRef = useRef<SynthVoice | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const natureVolRef = useRef(DEFAULT_NATURE_VOLUME);
  const musicVolRef = useRef(DEFAULT_MUSIC_VOLUME);
  const freqVolRef = useRef(DEFAULT_FREQUENCY_VOLUME);

  // Track pause state for synth layers (they can't truly pause — must stop/restart)
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

  // ─── Nature Layer (Procedural) ─────────────────────────────────────────────

  const startNatureLayer = useCallback((med: Meditation) => {
    stopNatureLayer();
    const ctx = getContext();
    const masterOutput = getMasterOutput(ctx);

    const synth = startNatureSynth(ctx, med.soundscape);
    if (!synth) return;

    // Create a volume control gain node between the synth output and master
    const volumeGain = ctx.createGain();
    volumeGain.gain.value = natureVolRef.current;
    synth.output.connect(volumeGain);
    volumeGain.connect(masterOutput);

    natureSynthRef.current = synth;
    natureGainRef.current = volumeGain;
  }, []);

  const stopNatureLayer = useCallback(() => {
    if (natureSynthRef.current) {
      natureSynthRef.current.stop();
      natureSynthRef.current = null;
    }
    if (natureGainRef.current) {
      try { natureGainRef.current.disconnect(); } catch {}
      natureGainRef.current = null;
    }
  }, []);

  // ─── Music Layer (Procedural) ──────────────────────────────────────────────

  const startMusicLayer = useCallback((med: Meditation) => {
    stopMusicLayer();
    if (med.musicMode === "none") return;

    const ctx = getContext();
    const masterOutput = getMasterOutput(ctx);

    const synth = startMusicSynth(ctx, med.musicMode);
    if (!synth) return;

    // Create a volume control gain node between the synth output and master
    const volumeGain = ctx.createGain();
    volumeGain.gain.value = musicVolRef.current;
    synth.output.connect(volumeGain);
    volumeGain.connect(masterOutput);

    musicSynthRef.current = synth;
    musicGainRef.current = volumeGain;
  }, []);

  const stopMusicLayer = useCallback(() => {
    if (musicSynthRef.current) {
      musicSynthRef.current.stop();
      musicSynthRef.current = null;
    }
    if (musicGainRef.current) {
      try { musicGainRef.current.disconnect(); } catch {}
      musicGainRef.current = null;
    }
  }, []);

  // ─── Frequency Layer (DDS Oscillator) ──────────────────────────────────────

  const startFreqVoice = useCallback((med: Meditation) => {
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

  // ─── Teardown ──────────────────────────────────────────────────────────────

  const teardownAll = useCallback(() => {
    stopNatureLayer();
    stopMusicLayer();
    stopFreqVoice();
  }, [stopNatureLayer, stopMusicLayer, stopFreqVoice]);

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
    [clearTick, teardownAll]
  );

  const pause = useCallback(() => {
    clearTick();
    // Procedural synths can't pause — stop them (they'll be recreated on resume)
    teardownAll();
    isPausedRef.current = true;
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearTick, teardownAll]);

  // ─── Timer ─────────────────────────────────────────────────────────────────

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      setState((prev) => {
        const next = prev.elapsedSec + 1;
        if (next >= totalSec) {
          // Session complete — stop outside the state updater
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

  // ─── Play ──────────────────────────────────────────────────────────────────

  const play = useCallback(async () => {
    if (!meditation) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    // Start (or restart after pause) the procedural nature layer
    if (!natureSynthRef.current) {
      startNatureLayer(meditation);
    }

    // Start (or restart after pause) the procedural music layer
    if (!musicSynthRef.current) {
      startMusicLayer(meditation);
    }

    // Frequency underlay (synth voice) — always (re)created on play
    if (mode === "frequency" && !freqVoiceRef.current) {
      startFreqVoice(meditation);
    }

    isPausedRef.current = false;
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    startTick();
    setState((prev) => ({ ...prev, isPlaying: true, isComplete: false }));
  }, [meditation, mode, startTick, startFreqVoice, startNatureLayer, startMusicLayer]);

  // ─── Volume Controls ───────────────────────────────────────────────────────

  const setNatureVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    natureVolRef.current = clamped;
    if (natureGainRef.current) {
      const ctx = getContext();
      natureGainRef.current.gain.linearRampToValueAtTime(
        clamped,
        ctx.currentTime + 0.05
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

  // ─── Mode Change ───────────────────────────────────────────────────────────

  // When the mode changes mid-session, add/remove the frequency layer
  useEffect(() => {
    if (!state.isPlaying || !meditation) return;
    if (mode === "frequency" && !freqVoiceRef.current) {
      startFreqVoice(meditation);
    } else if (mode === "sound" && freqVoiceRef.current) {
      stopFreqVoice(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  // Full teardown on unmount or meditation change
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
