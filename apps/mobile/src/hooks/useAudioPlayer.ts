/**
 * useAudioPlayer — live-synthesis frequency engine
 *
 * v3: pre-rendered frequency MP3s replaced with real-time oscillators
 * (react-native-audio-api). Solfeggio tones are pure sines at the exact Hz;
 * binaural entries generate a true stereo pair (200Hz carrier, left/right
 * offset by the beat frequency — headphones required for the effect).
 *
 * Public API is unchanged from the MP3 version:
 *   isPlaying / isLoading / volume / error state
 *   play(fadeInMs) / pause / stop / setVolume / setSleepTimer
 */
import { useEffect, useRef, useState, useCallback } from "react";
import * as KeepAwake from "expo-keep-awake";
import type { Frequency } from "@rih/shared-types";
import { createCatalogVoice, type SynthVoice } from "@/lib/synth";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
}

export function useAudioPlayer(frequency: Frequency | null) {
  const voiceRef = useRef<SynthVoice | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(0.8);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    volume: 0.8,
    error: null,
  });

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  const teardownVoice = useCallback((fadeOutSec = 0.3) => {
    if (voiceRef.current) {
      voiceRef.current.stop(fadeOutSec);
      voiceRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    clearSleepTimer();
    teardownVoice();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearSleepTimer, teardownVoice]);

  const play = useCallback(
    async (fadeInMs = 0) => {
      if (!frequency) return;
      // Oscillator voices are one-shot: (re)create on every play
      teardownVoice(0.1);
      const voice = createCatalogVoice(frequency, volumeRef.current);
      voice.start(Math.max(fadeInMs / 1000, 0.05));
      voiceRef.current = voice;
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));
    },
    [frequency, teardownVoice]
  );

  const pause = useCallback(async () => {
    teardownVoice();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [teardownVoice]);

  const stop = useCallback(async () => {
    stopAll();
  }, [stopAll]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    volumeRef.current = clamped;
    voiceRef.current?.setVolume(clamped);
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const setSleepTimer = useCallback(
    (minutes: number) => {
      clearSleepTimer();
      if (minutes <= 0) return;
      sleepTimerRef.current = setTimeout(() => {
        stopAll();
      }, minutes * 60 * 1000);
    },
    [clearSleepTimer, stopAll]
  );

  // Stop playback when the selected frequency changes or on unmount
  useEffect(() => {
    return () => {
      clearSleepTimer();
      teardownVoice();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [frequency?.id, clearSleepTimer, teardownVoice]);

  return {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    setSleepTimer,
  };
}
