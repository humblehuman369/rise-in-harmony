/**
 * useMeditationPlayer — layered meditation audio engine
 *
 * Up to three concurrent layers:
 *   1. Nature soundscape loop (rain / ocean / forest / wind / fire / bowl) — expo-audio
 *   2. Music bed from meditation.musicMode (ambient / drone / crystal) — expo-audio
 *   3. Optional healing-frequency underlay — live oscillator synthesis
 *      (react-native-audio-api), exact Hz instead of a pre-rendered loop
 *
 * Plus a 1-second session timer that:
 *   - advances the guidance script (equal time slices across the duration)
 *   - auto-stops the session when the meditation duration is reached
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Meditation, MusicMode } from "@rih/shared-types";
import { FREQUENCIES } from "@rih/shared-utils";
import { createCatalogVoice, type SynthVoice } from "@/lib/synth";

const NATURE_AUDIO_MAP: Record<string, number | null> = {
  rain: require("../../assets/sounds/ambient-rain.mp3"),
  ocean: require("../../assets/sounds/ambient-ocean.mp3"),
  forest: require("../../assets/sounds/ambient-forest.mp3"),
  wind: require("../../assets/sounds/ambient-wind.mp3"),
  fire: require("../../assets/sounds/ambient-fire.mp3"),
  river: require("../../assets/sounds/ambient-river.mp3"),
  night: require("../../assets/sounds/ambient-night.mp3"),
  cave: require("../../assets/sounds/ambient-cave.mp3"),
  bowl: require("../../assets/sounds/ambient-bowl.mp3"),
  silence: null,
};

const MUSIC_AUDIO_MAP: Partial<Record<MusicMode, number>> = {
  ambient: require("../../assets/sounds/music-ambient.mp3"),
  drone: require("../../assets/sounds/music-drone.mp3"),
  crystal: require("../../assets/sounds/music-crystal.mp3"),
};

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
  const naturePlayerRef = useRef<AudioPlayer | null>(null);
  const musicPlayerRef = useRef<AudioPlayer | null>(null);
  const freqVoiceRef = useRef<SynthVoice | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const natureVolRef = useRef(DEFAULT_NATURE_VOLUME);
  const musicVolRef = useRef(DEFAULT_MUSIC_VOLUME);
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

  const stopMusicPlayer = useCallback(() => {
    if (musicPlayerRef.current) {
      try {
        musicPlayerRef.current.pause();
        musicPlayerRef.current.remove();
      } catch {
        // already released
      }
      musicPlayerRef.current = null;
    }
  }, []);

  const startMusicPlayer = useCallback((med: Meditation) => {
    stopMusicPlayer();
    const source = MUSIC_AUDIO_MAP[med.musicMode];
    if (source === undefined) return;
    const p = createAudioPlayer(source);
    p.loop = true;
    p.volume = musicVolRef.current;
    p.play();
    musicPlayerRef.current = p;
  }, [stopMusicPlayer]);

  const teardownPlayers = useCallback(() => {
    if (naturePlayerRef.current) {
      try {
        naturePlayerRef.current.pause();
        naturePlayerRef.current.remove();
      } catch {
        // already released
      }
      naturePlayerRef.current = null;
    }
    stopMusicPlayer();
    stopFreqVoice();
  }, [stopFreqVoice, stopMusicPlayer]);

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
    musicPlayerRef.current?.pause();
    // Oscillator voices can't pause — stop and recreate on resume
    stopFreqVoice();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearTick, stopFreqVoice]);

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

    // Resume the nature loop if it already exists, otherwise create it
    if (naturePlayerRef.current) {
      naturePlayerRef.current.play();
    } else {
      const natureSource = NATURE_AUDIO_MAP[meditation.soundscape] ?? null;
      if (natureSource !== null) {
        const p = createAudioPlayer(natureSource);
        p.loop = true;
        p.volume = natureVolRef.current;
        p.play();
        naturePlayerRef.current = p;
      }
    }
    // Music bed from meditation.musicMode
    if (musicPlayerRef.current) {
      musicPlayerRef.current.play();
    } else {
      startMusicPlayer(meditation);
    }
    // Frequency underlay is a synth voice — always (re)created on play
    if (mode === "frequency" && !freqVoiceRef.current) {
      startFreqVoice(meditation);
    }

    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    startTick();
    setState((prev) => ({ ...prev, isPlaying: true, isComplete: false }));
  }, [meditation, mode, startTick, startFreqVoice, startMusicPlayer]);

  const setNatureVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    natureVolRef.current = clamped;
    if (naturePlayerRef.current) naturePlayerRef.current.volume = clamped;
    setState((prev) => ({ ...prev, natureVolume: clamped }));
  }, []);

  const setFrequencyVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    freqVolRef.current = clamped;
    freqVoiceRef.current?.setVolume(clamped);
    setState((prev) => ({ ...prev, frequencyVolume: clamped }));
  }, []);

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
