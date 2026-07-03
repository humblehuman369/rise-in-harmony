/**
 * useMeditationPlayer — layered meditation audio engine
 *
 * Two concurrent expo-audio players:
 *   1. Nature soundscape loop (rain / ocean / forest / wind / fire)
 *   2. Optional healing-frequency underlay (from the bundled frequency loops)
 *
 * Plus a 1-second session timer that:
 *   - advances the guidance script (equal time slices across the duration)
 *   - auto-stops the session when the meditation duration is reached
 *
 * The music layer from the web app (procedural Web Audio synthesis) is not
 * supported on mobile yet — planned for the Studio phase.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Meditation } from "@rih/shared-types";
import { FREQUENCY_AUDIO_MAP } from "./useAudioPlayer";

// Nature soundscape loops (bundled). "bowl" and "silence" have no asset —
// the nature layer stays silent for those soundscapes.
const NATURE_AUDIO_MAP: Record<string, number | null> = {
  rain: require("../../assets/sounds/ambient-rain.mp3"),
  ocean: require("../../assets/sounds/ambient-ocean.mp3"),
  forest: require("../../assets/sounds/ambient-forest.mp3"),
  wind: require("../../assets/sounds/ambient-wind.mp3"),
  fire: require("../../assets/sounds/ambient-fire.mp3"),
  bowl: null,
  silence: null,
};

const DEFAULT_NATURE_VOLUME = 0.6;
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
  const naturePlayerRef = useRef<AudioPlayer | null>(null);
  const freqPlayerRef = useRef<AudioPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const natureVolRef = useRef(DEFAULT_NATURE_VOLUME);
  const freqVolRef = useRef(DEFAULT_FREQUENCY_VOLUME);

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

  const teardownPlayers = useCallback(() => {
    for (const ref of [naturePlayerRef, freqPlayerRef]) {
      if (ref.current) {
        try {
          ref.current.pause();
          ref.current.remove();
        } catch {
          // already released
        }
        ref.current = null;
      }
    }
  }, []);

  const stop = useCallback(
    (markComplete = false) => {
      clearTick();
      teardownPlayers();
      KeepAwake.deactivateKeepAwake().catch(() => {});
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isComplete: markComplete ? true : prev.isComplete,
      }));
    },
    [clearTick, teardownPlayers]
  );

  const pause = useCallback(() => {
    clearTick();
    naturePlayerRef.current?.pause();
    freqPlayerRef.current?.pause();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearTick]);

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

  const play = useCallback(async () => {
    if (!meditation) return;
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    // Resume if players already exist
    if (naturePlayerRef.current || freqPlayerRef.current) {
      naturePlayerRef.current?.play();
      freqPlayerRef.current?.play();
    } else {
      const natureSource = NATURE_AUDIO_MAP[meditation.soundscape] ?? null;
      if (natureSource !== null) {
        const p = createAudioPlayer(natureSource);
        p.loop = true;
        p.volume = natureVolRef.current;
        p.play();
        naturePlayerRef.current = p;
      }
      if (mode === "frequency") {
        const freqSource = FREQUENCY_AUDIO_MAP[meditation.recommendedFrequencyId];
        if (freqSource !== undefined) {
          const p = createAudioPlayer(freqSource);
          p.loop = true;
          p.volume = freqVolRef.current;
          p.play();
          freqPlayerRef.current = p;
        }
      }
    }

    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    startTick();
    setState((prev) => ({ ...prev, isPlaying: true, isComplete: false }));
  }, [meditation, mode, startTick]);

  const setNatureVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    natureVolRef.current = clamped;
    if (naturePlayerRef.current) naturePlayerRef.current.volume = clamped;
    setState((prev) => ({ ...prev, natureVolume: clamped }));
  }, []);

  const setFrequencyVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    freqVolRef.current = clamped;
    if (freqPlayerRef.current) freqPlayerRef.current.volume = clamped;
    setState((prev) => ({ ...prev, frequencyVolume: clamped }));
  }, []);

  // When the mode changes mid-session, add/remove the frequency layer
  useEffect(() => {
    if (!state.isPlaying || !meditation) return;
    if (mode === "frequency" && !freqPlayerRef.current) {
      const freqSource = FREQUENCY_AUDIO_MAP[meditation.recommendedFrequencyId];
      if (freqSource !== undefined) {
        const p = createAudioPlayer(freqSource);
        p.loop = true;
        p.volume = freqVolRef.current;
        p.play();
        freqPlayerRef.current = p;
      }
    } else if (mode === "sound" && freqPlayerRef.current) {
      try {
        freqPlayerRef.current.pause();
        freqPlayerRef.current.remove();
      } catch {}
      freqPlayerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Full teardown on unmount or meditation change
  useEffect(() => {
    return () => {
      clearTick();
      teardownPlayers();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [meditation?.id, clearTick, teardownPlayers]);

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
