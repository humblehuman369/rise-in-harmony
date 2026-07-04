/**
 * usePrecisionPlayer — custom frequency generator engine (mobile)
 *
 * Mobile port of the web Precision Player:
 *   - Any frequency 1–22000 Hz at 0.01 Hz resolution
 *   - Four waveforms (sine / square / triangle / sawtooth)
 *   - Pure tone, true binaural (stereo L/R pair), or isochronic (pulsed) modes
 *
 * Frequency changes retune the running voice live; waveform/mode/beat changes
 * rebuild the voice (with a short crossfade) since the audio graph differs.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as KeepAwake from "expo-keep-awake";
import { createVoice, type SynthVoice } from "@/lib/synth";
import { clampHz, clampBeatHz, type Waveform } from "@/lib/synthMath";

export type PlayMode = "pure" | "binaural" | "isochronic";

export interface PrecisionConfig {
  hz: number;
  waveform: Waveform;
  mode: PlayMode;
  /** Beat/pulse rate in Hz (binaural + isochronic modes) */
  beatHz: number;
}

export function usePrecisionPlayer() {
  const voiceRef = useRef<SynthVoice | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const volumeRef = useRef(0.7);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const [volume, setVolumeState] = useState(0.7);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardown = useCallback((fadeOutSec = 0.3) => {
    if (voiceRef.current) {
      voiceRef.current.stop(fadeOutSec);
      voiceRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    teardown();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setIsPlaying(false);
  }, [clearTimer, teardown]);

  const play = useCallback(
    (config: PrecisionConfig) => {
      teardown(0.2);
      const voice = createVoice({
        hz: clampHz(config.hz),
        waveform: config.waveform,
        binauralBeatHz:
          config.mode === "binaural" ? clampBeatHz(config.beatHz) : undefined,
        isochronicHz:
          config.mode === "isochronic" ? clampBeatHz(config.beatHz) : undefined,
        volume: volumeRef.current,
      });
      voice.start(0.8);
      voiceRef.current = voice;
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
      if (!timerRef.current) {
        setPlayTime(0);
        timerRef.current = setInterval(() => setPlayTime((t) => t + 1), 1000);
      }
      setIsPlaying(true);
    },
    [teardown]
  );

  /** Live retune without rebuilding the voice (phase stays continuous). */
  const retune = useCallback((hz: number) => {
    voiceRef.current?.setFrequency(clampHz(hz));
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    voiceRef.current?.setVolume(clamped);
    setVolumeState(clamped);
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      teardown();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [clearTimer, teardown]);

  return { isPlaying, playTime, volume, play, stop, retune, setVolume };
}
