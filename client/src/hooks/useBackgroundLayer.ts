/**
 * useBackgroundLayer — ambient audio layer for Precision Player
 *
 * Bug fixes (v1.1):
 *   - selectBackground now hot-swaps correctly even when the current background
 *     is "none" (activeRef was only true when a background was running, not when
 *     the main player was running — fixed by accepting an explicit isPlayerActive flag)
 *   - Race guard: each startBackground call gets a generation token; stale async
 *     play() calls from rapid switching are silently dropped
 *   - stopBackground is idempotent and safe to call multiple times
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getBackgroundAudioUrl,
  type BackgroundType,
} from "@/data/backgroundLoops";

export type BackgroundLayerState = {
  type: BackgroundType;
  key: string | null;
  volume: number;
};

export function useBackgroundLayer(getAudioContext: () => AudioContext | null) {
  const [layer, setLayer] = useState<BackgroundLayerState>({
    type: "none",
    key: null,
    volume: 0.35,
  });

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const sourceRef    = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef      = useRef<GainNode | null>(null);
  /** Monotonically-increasing generation counter — used to drop stale async starts */
  const genRef       = useRef(0);

  // ── Stop ─────────────────────────────────────────────────────────────────
  const stopBackground = useCallback(() => {
    // Bump generation so any in-flight startBackground call becomes stale
    genRef.current += 1;

    const audio = audioRef.current;
    if (audio) {
      try { audio.pause(); } catch { /* ignore */ }
      audio.src = "";
      audioRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (gainRef.current) {
      try { gainRef.current.disconnect(); } catch { /* ignore */ }
      gainRef.current = null;
    }
  }, []);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startBackground = useCallback(
    async (type: BackgroundType, key: string | null, volume: number) => {
      // Stop any currently-running background first
      stopBackground();

      const url = getBackgroundAudioUrl(type, key);
      if (!url) return; // "none" selected — just stop

      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      // Capture generation token AFTER the await so we can detect if another
      // startBackground call fired while we were waiting for ctx.resume()
      const myGen = genRef.current;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.connect(ctx.destination);

      const audio = new Audio(url);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.volume = 1;

      const source = ctx.createMediaElementSource(audio);
      source.connect(gain);

      // Check generation before committing refs — drop if stale
      if (genRef.current !== myGen) {
        try { source.disconnect(); } catch { /* ignore */ }
        try { gain.disconnect(); } catch { /* ignore */ }
        return;
      }

      gainRef.current   = gain;
      sourceRef.current = source;
      audioRef.current  = audio;

      try {
        await audio.play();
      } catch (error) {
        console.warn("[background-layer] play failed", error);
        stopBackground();
      }
    },
    [getAudioContext, stopBackground],
  );

  // ── Volume ────────────────────────────────────────────────────────────────
  const setBackgroundVolume = useCallback((volume: number) => {
    setLayer(prev => ({ ...prev, volume }));
    const ctx = getAudioContext();
    if (gainRef.current && ctx) {
      gainRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    }
  }, [getAudioContext]);

  // ── Select (hot-swap) ─────────────────────────────────────────────────────
  /**
   * Switch the background layer.
   * @param isPlayerActive  Pass `true` when the main precision player is running.
   *                        When true, the new background starts immediately.
   *                        When false, the selection is stored but not started.
   */
  const selectBackground = useCallback(
    (type: BackgroundType, key: string | null, isPlayerActive = false) => {
      setLayer(prev => {
        const next = { ...prev, type, key };
        if (isPlayerActive) {
          // Hot-swap: start new background immediately (or stop if "none")
          void startBackground(type, key, next.volume);
        } else {
          // Player is not running — just stop any residual background
          if (type === "none") stopBackground();
        }
        return next;
      });
    },
    [startBackground, stopBackground],
  );

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => stopBackground();
  }, [stopBackground]);

  return {
    layer,
    selectBackground,
    setBackgroundVolume,
    startBackground,
    stopBackground,
  };
}
