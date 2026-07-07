/**
 * useAudioPlayer — live-synthesis frequency engine
 *
 * v3: pre-rendered frequency MP3s replaced with real-time oscillators
 * (react-native-audio-api). Solfeggio tones are pure sines at the exact Hz;
 * binaural entries generate a true stereo pair (200Hz carrier, left/right
 * offset by the beat frequency — headphones required for the effect).
 *
 * v4: "recorded" catalog entries (pre-mixed Schumann binaural sessions) are
 * streamed from the web host and looped via expo-audio instead of synthesized.
 *
 * Public API is unchanged from the MP3 version:
 *   isPlaying / isLoading / volume / error state
 *   play(fadeInMs) / pause / stop / setVolume / setSleepTimer
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { Frequency } from "@rih/shared-types";
import { createCatalogVoice, type SynthVoice } from "@/lib/synth";
import { resolveAssetUrl } from "@/lib/api";
import { getDownloadedUri } from "@/lib/recordedDownloads";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  error: string | null;
}

export function useAudioPlayer(frequency: Frequency | null) {
  const voiceRef = useRef<SynthVoice | null>(null);
  const mediaPlayerRef = useRef<AudioPlayer | null>(null);
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

  const teardownMediaPlayer = useCallback(() => {
    if (mediaPlayerRef.current) {
      try {
        mediaPlayerRef.current.pause();
        mediaPlayerRef.current.remove();
      } catch {
        // already released
      }
      mediaPlayerRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    clearSleepTimer();
    teardownVoice();
    teardownMediaPlayer();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [clearSleepTimer, teardownVoice, teardownMediaPlayer]);

  const play = useCallback(
    async (fadeInMs = 0) => {
      if (!frequency) return;

      // ── Recorded session path: stream + loop the pre-mixed file ──────────
      if (frequency.audioUrl) {
        teardownVoice(0.1);

        // Resume if the same track is paused
        if (mediaPlayerRef.current) {
          mediaPlayerRef.current.play();
          KeepAwake.activateKeepAwakeAsync().catch(() => {});
          setState((prev) => ({ ...prev, isPlaying: true, error: null }));
          return;
        }

        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
          // Prefer the offline copy when it exists; fall back to streaming
          const uri = getDownloadedUri(frequency) ?? resolveAssetUrl(frequency.audioUrl);
          const p = createAudioPlayer({ uri });
          p.loop = true;
          p.volume = volumeRef.current;
          p.play();
          mediaPlayerRef.current = p;
          KeepAwake.activateKeepAwakeAsync().catch(() => {});
          setState((prev) => ({ ...prev, isPlaying: true, isLoading: false }));
        } catch {
          teardownMediaPlayer();
          setState((prev) => ({
            ...prev,
            isPlaying: false,
            isLoading: false,
            error: "Couldn't stream this session — check your connection.",
          }));
        }
        return;
      }

      // ── Live synthesis path ───────────────────────────────────────────────
      teardownMediaPlayer();
      // Oscillator voices are one-shot: (re)create on every play
      teardownVoice(0.1);
      const voice = createCatalogVoice(frequency, volumeRef.current);
      voice.start(Math.max(fadeInMs / 1000, 0.05));
      voiceRef.current = voice;
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));
    },
    [frequency, teardownVoice, teardownMediaPlayer]
  );

  const pause = useCallback(async () => {
    teardownVoice();
    // Media players pause in place so play() resumes from the same position
    mediaPlayerRef.current?.pause();
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
    if (mediaPlayerRef.current) mediaPlayerRef.current.volume = clamped;
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
      teardownMediaPlayer();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [frequency?.id, clearSleepTimer, teardownVoice, teardownMediaPlayer]);

  return {
    ...state,
    play,
    pause,
    stop,
    setVolume,
    setSleepTimer,
  };
}
