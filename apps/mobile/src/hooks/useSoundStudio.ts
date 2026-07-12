/**
 * useSoundStudio (mobile) — Layered Ambient Audio Engine
 *
 * Port of the web app's useSoundStudio to React Native:
 *   1. Healing Frequency — pure sine at the target Hz (react-native-audio-api oscillator)
 *   2. Musical Harmony  — bundled royalty-free ambient/drone/crystal loops (expo-audio)
 *   3. Nature Soundscape — bundled real audio loops via expo-audio
 *
 * Differences from web:
 *   - No DynamicsCompressor (not available in react-native-audio-api 0.12) —
 *     layer gains are conservative to avoid clipping when stacked.
 *   - Nature and music layers live outside the synthesis graph (expo-audio),
 *     so effective volume is layerVolume * masterVolume, recomputed on change.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  AudioContext,
  type GainNode,
  type OscillatorNode,
} from "react-native-audio-api";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import type { StudioMusicMode, StudioNatureSound, StudioMixSettings } from "@rih/shared-types";

export interface StudioState {
  isPlaying: boolean;
  frequencyHz: number;
  frequencyVolume: number; // 0–1
  musicMode: StudioMusicMode;
  musicVolume: number; // 0–1
  natureSound: StudioNatureSound;
  natureVolume: number; // 0–1
  masterVolume: number; // 0–1
}

const NATURE_AUDIO_MAP: Record<string, number> = {
  rain: require("../../assets/sounds/ambient-rain.mp3"),
  ocean: require("../../assets/sounds/ambient-ocean.mp3"),
  forest: require("../../assets/sounds/ambient-forest.mp3"),
  wind: require("../../assets/sounds/ambient-wind.mp3"),
  fire: require("../../assets/sounds/ambient-fire.mp3"),
};

const MUSIC_AUDIO_MAP: Partial<Record<StudioMusicMode, number>> = {
  ambient: require("../../assets/sounds/music-ambient.mp3"),
  drone: require("../../assets/sounds/music-drone.mp3"),
  crystal: require("../../assets/sounds/music-crystal.mp3"),
};

export function useSoundStudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const freqGainRef = useRef<GainNode | null>(null);

  const freqOscRef = useRef<OscillatorNode | null>(null);
  const musicPlayerRef = useRef<AudioPlayer | null>(null);
  const naturePlayerRef = useRef<AudioPlayer | null>(null);

  const [state, setState] = useState<StudioState>({
    isPlaying: false,
    frequencyHz: 432,
    frequencyVolume: 0.6,
    musicMode: "ambient",
    musicVolume: 0.4,
    natureSound: "rain",
    natureVolume: 0.35,
    masterVolume: 0.8,
  });

  // Mirror volumes in refs so audio callbacks never read stale state
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Audio context bootstrap ──────────────────────────────────────────────
  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const ctx = new AudioContext();

      const master = ctx.createGain();
      master.gain.value = stateRef.current.masterVolume;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      const freqGain = ctx.createGain();
      freqGain.gain.value = stateRef.current.frequencyVolume;
      freqGain.connect(master);
      freqGainRef.current = freqGain;

      ctxRef.current = ctx;
    }
    return ctxRef.current;
  }, []);

  // ── Stop helpers ─────────────────────────────────────────────────────────
  const stopFrequency = useCallback(() => {
    if (freqOscRef.current) {
      try {
        freqOscRef.current.stop(0);
        freqOscRef.current.disconnect();
      } catch { /* oscillator already stopped or disconnected */ }
      freqOscRef.current = null;
    }
  }, []);

  const stopMusic = useCallback(() => {
    if (musicPlayerRef.current) {
      try {
        musicPlayerRef.current.pause();
        musicPlayerRef.current.remove();
      } catch {}
      musicPlayerRef.current = null;
    }
  }, []);

  const stopNature = useCallback(() => {
    if (naturePlayerRef.current) {
      try {
        naturePlayerRef.current.pause();
        naturePlayerRef.current.remove();
      } catch {}
      naturePlayerRef.current = null;
    }
  }, []);

  // ── Frequency layer ──────────────────────────────────────────────────────
  const startFrequency = useCallback(
    (hz: number) => {
      stopFrequency();
      const ctx = getCtx();
      if (!freqGainRef.current) return;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;

      // Soft 2-second fade-in
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);

      osc.connect(env);
      env.connect(freqGainRef.current);
      osc.start(0);
      freqOscRef.current = osc;
    },
    [getCtx, stopFrequency]
  );

  // ── Music layer — bundled royalty-free loops via expo-audio ────────────────
  const applyMusicVolume = useCallback((musicVolume: number, masterVolume: number) => {
    if (musicPlayerRef.current) {
      musicPlayerRef.current.volume = Math.max(0, Math.min(1, musicVolume * masterVolume));
    }
  }, []);

  const startMusic = useCallback(
    (mode: StudioMusicMode, musicVolume: number, masterVolume: number) => {
      stopMusic();
      if (mode === "none") return;
      const source = MUSIC_AUDIO_MAP[mode];
      if (source === undefined) return;
      const p = createAudioPlayer(source);
      p.loop = true;
      p.volume = Math.max(0, Math.min(1, musicVolume * masterVolume));
      p.play();
      musicPlayerRef.current = p;
    },
    [stopMusic]
  );

  // ── Nature layer — bundled loops via expo-audio ──────────────────────────
  const applyNatureVolume = useCallback((natureVolume: number, masterVolume: number) => {
    if (naturePlayerRef.current) {
      naturePlayerRef.current.volume = Math.max(0, Math.min(1, natureVolume * masterVolume));
    }
  }, []);

  const startNature = useCallback(
    (sound: StudioNatureSound, natureVolume: number, masterVolume: number) => {
      stopNature();
      if (sound === "none") return;
      const source = NATURE_AUDIO_MAP[sound];
      if (source === undefined) return;
      const p = createAudioPlayer(source);
      p.loop = true;
      p.volume = Math.max(0, Math.min(1, natureVolume * masterVolume));
      p.play();
      naturePlayerRef.current = p;
    },
    [stopNature]
  );

  // ── Master play / stop ───────────────────────────────────────────────────
  const startAllLayers = useCallback(
    (s: StudioState) => {
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
        interruptionModeAndroid: "doNotMix",
      }).catch(() => {});

      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});

      if (masterGainRef.current) masterGainRef.current.gain.value = s.masterVolume;
      if (freqGainRef.current) freqGainRef.current.gain.value = s.frequencyVolume;

      startFrequency(s.frequencyHz);
      startMusic(s.musicMode, s.musicVolume, s.masterVolume);
      startNature(s.natureSound, s.natureVolume, s.masterVolume);
      KeepAwake.activateKeepAwakeAsync().catch(() => {});
    },
    [getCtx, startFrequency, startMusic, startNature]
  );

  const stopAllLayers = useCallback(() => {
    stopFrequency();
    stopMusic();
    stopNature();
    KeepAwake.deactivateKeepAwake().catch(() => {});
  }, [stopFrequency, stopMusic, stopNature]);

  // ── Public API ───────────────────────────────────────────────────────────
  const play = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, isPlaying: true };
      startAllLayers(next);
      return next;
    });
  }, [startAllLayers]);

  const stop = useCallback(() => {
    stopAllLayers();
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, [stopAllLayers]);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (prev.isPlaying) {
        stopAllLayers();
        return { ...prev, isPlaying: false };
      }
      const next = { ...prev, isPlaying: true };
      startAllLayers(next);
      return next;
    });
  }, [startAllLayers, stopAllLayers]);

  /** Update a single layer volume in real-time without restarting */
  const setLayerVolume = useCallback(
    (layer: "frequency" | "music" | "nature" | "master", value: number) => {
      setState((prev) => {
        const next = { ...prev };
        const ctxTime = ctxRef.current?.currentTime ?? 0;
        if (layer === "frequency") {
          next.frequencyVolume = value;
          freqGainRef.current?.gain.linearRampToValueAtTime(value, ctxTime + 0.05);
        } else if (layer === "music") {
          next.musicVolume = value;
          applyMusicVolume(value, prev.masterVolume);
        } else if (layer === "nature") {
          next.natureVolume = value;
          applyNatureVolume(value, prev.masterVolume);
        } else {
          next.masterVolume = value;
          masterGainRef.current?.gain.linearRampToValueAtTime(value, ctxTime + 0.05);
          applyNatureVolume(prev.natureVolume, value);
          applyMusicVolume(prev.musicVolume, value);
        }
        return next;
      });
    },
    [applyNatureVolume, applyMusicVolume]
  );

  /** Change the healing frequency — restarts only the frequency layer */
  const setFrequency = useCallback(
    (hz: number) => {
      setState((prev) => {
        if (prev.isPlaying) startFrequency(hz);
        return { ...prev, frequencyHz: hz };
      });
    },
    [startFrequency]
  );

  /** Change music mode — restarts only the music layer */
  const setMusicMode = useCallback(
    (mode: StudioMusicMode) => {
      setState((prev) => {
        if (prev.isPlaying) startMusic(mode, prev.musicVolume, prev.masterVolume);
        return { ...prev, musicMode: mode };
      });
    },
    [startMusic]
  );

  /** Change nature sound — restarts only the nature layer */
  const setNatureSound = useCallback(
    (sound: StudioNatureSound) => {
      setState((prev) => {
        if (prev.isPlaying) startNature(sound, prev.natureVolume, prev.masterVolume);
        return { ...prev, natureSound: sound };
      });
    },
    [startNature]
  );

  /** Apply a preset's mix settings in one shot */
  const applySettings = useCallback(
    (settings: StudioMixSettings) => {
      setState((prev) => {
        const next: StudioState = {
          ...prev,
          frequencyHz: settings.frequencyHz,
          musicMode: settings.musicMode,
          natureSound: settings.natureSound,
          frequencyVolume: settings.frequencyVolume,
          musicVolume: settings.musicVolume,
          natureVolume: settings.natureVolume,
          masterVolume: settings.masterVolume ?? prev.masterVolume,
        };
        if (prev.isPlaying) startAllLayers(next);
        else {
          // Sync gains for the next play
          if (freqGainRef.current) freqGainRef.current.gain.value = next.frequencyVolume;
          if (masterGainRef.current) masterGainRef.current.gain.value = next.masterVolume;
        }
        return next;
      });
    },
    [startAllLayers]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllLayers();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [stopAllLayers]);

  return {
    state,
    play,
    stop,
    toggle,
    setLayerVolume,
    setFrequency,
    setMusicMode,
    setNatureSound,
    applySettings,
  };
}
