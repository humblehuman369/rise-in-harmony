/**
 * useAudioPlayer — expo-audio frequency audio engine
 *
 * Handles:
 * - Loading and playing frequency audio files from the asset bundle
 * - Background audio mode (plays in silent mode on iOS)
 * - Volume control with fade-in
 * - Sleep timer (auto-stop after N minutes)
 * - Keep-awake while playing (screen stays on)
 * - Proper cleanup on unmount
 *
 * NOTE: Migrated from the deprecated `expo-av` (removed in Expo SDK 54) to
 * `expo-audio`. Times reported by expo-audio are in seconds; we expose ms.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioStatus,
} from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Frequency } from "@rih/shared-types";

// Canonical frequency → bundled audio asset map. Single source of truth —
// screens should import `getFrequencyAudioSource` instead of re-declaring this.
// Naming convention: {hz}hz.mp3 (e.g., 396hz.mp3, 528hz.mp3).
export const FREQUENCY_AUDIO_MAP: Record<string, number> = {
  "174": require("../../assets/sounds/174hz.mp3"),
  "285": require("../../assets/sounds/285hz.mp3"),
  "396": require("../../assets/sounds/396hz.mp3"),
  "417": require("../../assets/sounds/417hz.mp3"),
  "432": require("../../assets/sounds/432hz.mp3"),
  "528": require("../../assets/sounds/528hz.mp3"),
  "639": require("../../assets/sounds/639hz.mp3"),
  "741": require("../../assets/sounds/741hz.mp3"),
  "852": require("../../assets/sounds/852hz.mp3"),
  "963": require("../../assets/sounds/963hz.mp3"),
  alpha: require("../../assets/sounds/alpha-binaural.mp3"),
  theta: require("../../assets/sounds/theta-binaural.mp3"),
  delta: require("../../assets/sounds/delta-binaural.mp3"),
};

export function getFrequencyAudioSource(id: string): number | undefined {
  return FREQUENCY_AUDIO_MAP[id];
}

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  positionMs: number;
  durationMs: number;
  error: string | null;
}

export function useAudioPlayer(frequency: Frequency | null) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const statusSubRef = useRef<{ remove: () => void } | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror the target volume in a ref so play()/loadSound() closures never read
  // stale state.
  const volumeRef = useRef(0.8);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    volume: 0.8,
    positionMs: 0,
    durationMs: 0,
    error: null,
  });

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const teardownPlayer = useCallback(() => {
    clearFadeInterval();
    statusSubRef.current?.remove();
    statusSubRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {
        // player already released
      }
      playerRef.current = null;
    }
  }, [clearFadeInterval]);

  const teardown = useCallback(() => {
    teardownPlayer();
    clearSleepTimer();
    KeepAwake.deactivateKeepAwake().catch(() => {});
  }, [teardownPlayer, clearSleepTimer]);

  const loadSound = useCallback(
    (freq: Frequency) => {
      teardownPlayer();
      const source = FREQUENCY_AUDIO_MAP[freq.id];
      if (source === undefined) {
        setState((prev) => ({
          ...prev,
          error: `No audio file for frequency ${freq.hz}Hz`,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const player = createAudioPlayer(source, { updateInterval: 500 });
        player.loop = true;
        player.volume = volumeRef.current;
        statusSubRef.current = player.addListener(
          "playbackStatusUpdate",
          (status: AudioStatus) => {
            setState((prev) => ({
              ...prev,
              isPlaying: status.playing,
              isLoading: !status.isLoaded,
              positionMs: (status.currentTime ?? 0) * 1000,
              durationMs: (status.duration ?? 0) * 1000,
            }));
          }
        );
        playerRef.current = player;
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load audio",
        }));
      }
    },
    [teardownPlayer]
  );

  // Configure the audio session once on mount, tear everything down on unmount.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});

    return () => {
      teardown();
    };
  }, [teardown]);

  // (Re)load the sound whenever the selected frequency changes.
  useEffect(() => {
    if (frequency) {
      loadSound(frequency);
    } else {
      teardown();
    }
  }, [frequency?.id, frequency, loadSound, teardown]);

  const play = useCallback(async (fadeInMs = 0) => {
    const player = playerRef.current;
    if (!player) return;
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    clearFadeInterval();

    const target = volumeRef.current;
    if (fadeInMs > 0) {
      player.volume = 0;
      player.play();
      const steps = 20;
      const stepMs = Math.max(fadeInMs / steps, 16);
      let step = 0;
      fadeIntervalRef.current = setInterval(() => {
        step++;
        const vol = Math.min((step / steps) * target, target);
        if (playerRef.current) playerRef.current.volume = vol;
        if (step >= steps) clearFadeInterval();
      }, stepMs);
    } else {
      player.volume = target;
      player.play();
    }
  }, [clearFadeInterval]);

  const pause = useCallback(async () => {
    clearFadeInterval();
    playerRef.current?.pause();
    KeepAwake.deactivateKeepAwake().catch(() => {});
  }, [clearFadeInterval]);

  const stop = useCallback(async () => {
    clearFadeInterval();
    clearSleepTimer();
    const player = playerRef.current;
    if (player) {
      player.pause();
      await player.seekTo(0).catch(() => {});
    }
    KeepAwake.deactivateKeepAwake().catch(() => {});
  }, [clearFadeInterval, clearSleepTimer]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    volumeRef.current = clamped;
    if (playerRef.current) playerRef.current.volume = clamped;
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const setSleepTimer = useCallback(
    (minutes: number) => {
      clearSleepTimer();
      if (minutes <= 0) return;
      sleepTimerRef.current = setTimeout(() => {
        stop();
      }, minutes * 60 * 1000);
    },
    [clearSleepTimer, stop]
  );

  return {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    setSleepTimer,
  };
}
