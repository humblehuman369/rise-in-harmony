/**
 * useAudioPlayer — expo-av frequency audio engine
 *
 * Handles:
 * - Loading and playing frequency audio files from the asset bundle
 * - Background audio mode (plays in silent mode on iOS)
 * - Volume control with fade-in/fade-out
 * - Sleep timer (auto-stop after N minutes)
 * - Keep-awake while playing (screen stays on)
 * - Proper cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Audio, type AVPlaybackStatus } from "expo-av";
import * as KeepAwake from "expo-keep-awake";
import type { Frequency } from "@rih/shared-types";

// Frequency audio file map — files must be bundled in assets/sounds/
// Naming convention: {hz}hz.mp3 (e.g., 396hz.mp3, 528hz.mp3)
const FREQUENCY_AUDIO_MAP: Record<string, ReturnType<typeof require>> = {
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
  "alpha": require("../../assets/sounds/alpha-binaural.mp3"),
  "theta": require("../../assets/sounds/theta-binaural.mp3"),
  "delta": require("../../assets/sounds/delta-binaural.mp3"),
  "alpha-isochronic": require("../../assets/sounds/alpha-isochronic.mp3"),
  "schumann": require("../../assets/sounds/schumann-7hz.mp3"),
};

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  positionMs: number;
  durationMs: number;
  error: string | null;
}

export function useAudioPlayer(frequency: Frequency | null) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    volume: 0.8,
    positionMs: 0,
    durationMs: 0,
    error: null,
  });

  // Configure audio session on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      unloadSound();
    };
  }, []);

  // Reload sound when frequency changes
  useEffect(() => {
    if (frequency) {
      loadSound(frequency);
    } else {
      unloadSound();
    }
  }, [frequency?.id]);

  const loadSound = useCallback(async (freq: Frequency) => {
    await unloadSound();
    const source = FREQUENCY_AUDIO_MAP[freq.id];
    if (!source) {
      setState((prev) => ({
        ...prev,
        error: `No audio file for frequency ${freq.hz}Hz`,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          isLooping: true,
          volume: state.volume,
          shouldPlay: false,
        },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load audio",
      }));
    }
  }, [state.volume]);

  const unloadSound = useCallback(async () => {
    clearFadeInterval();
    clearSleepTimer();
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    KeepAwake.deactivateKeepAwakeAsync();
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      positionMs: 0,
    }));
  }, []);

  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      setState((prev) => ({
        ...prev,
        isPlaying: status.isPlaying,
        positionMs: status.positionMillis,
        durationMs: status.durationMillis ?? 0,
      }));
    },
    []
  );

  const play = useCallback(async (fadeInMs = 0) => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
    KeepAwake.activateKeepAwakeAsync();

    if (fadeInMs > 0) {
      await soundRef.current.setVolumeAsync(0);
      const targetVolume = state.volume;
      const steps = 20;
      const stepMs = fadeInMs / steps;
      let step = 0;
      fadeIntervalRef.current = setInterval(async () => {
        step++;
        const vol = (step / steps) * targetVolume;
        await soundRef.current?.setVolumeAsync(Math.min(vol, targetVolume));
        if (step >= steps) clearFadeInterval();
      }, stepMs);
    }
  }, [state.volume]);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    KeepAwake.deactivateKeepAwakeAsync();
  }, []);

  const stop = useCallback(async () => {
    await soundRef.current?.stopAsync();
    await soundRef.current?.setPositionAsync(0);
    KeepAwake.deactivateKeepAwakeAsync();
    clearSleepTimer();
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    await soundRef.current?.setVolumeAsync(clamped);
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const setSleepTimer = useCallback((minutes: number) => {
    clearSleepTimer();
    sleepTimerRef.current = setTimeout(() => {
      stop();
    }, minutes * 60 * 1000);
  }, [stop]);

  const clearFadeInterval = () => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  };

  const clearSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  };

  return {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    setSleepTimer,
  };
}
