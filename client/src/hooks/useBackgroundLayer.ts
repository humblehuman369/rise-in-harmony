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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const activeRef = useRef(false);

  const stopBackground = useCallback((immediate = true) => {
    activeRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    gainRef.current?.disconnect();
    gainRef.current = null;
    if (immediate) {
      // no-op — graph nodes disconnected
    }
  }, []);

  const startBackground = useCallback(
    async (type: BackgroundType, key: string | null, volume: number) => {
      stopBackground(true);
      const url = getBackgroundAudioUrl(type, key);
      if (!url) return;

      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.connect(ctx.destination);
      gainRef.current = gain;

      const audio = new Audio(url);
      audio.loop = true;
      audio.crossOrigin = "anonymous";
      audio.volume = 1;

      const source = ctx.createMediaElementSource(audio);
      source.connect(gain);
      sourceRef.current = source;
      audioRef.current = audio;
      activeRef.current = true;

      try {
        await audio.play();
      } catch (error) {
        console.warn("[background-layer] play failed", error);
        stopBackground(true);
      }
    },
    [getAudioContext, stopBackground],
  );

  const setBackgroundVolume = useCallback((volume: number) => {
    setLayer(prev => ({ ...prev, volume }));
    const ctx = getAudioContext();
    if (gainRef.current && ctx) {
      gainRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    }
  }, [getAudioContext]);

  const selectBackground = useCallback(
    (type: BackgroundType, key: string | null) => {
      setLayer(prev => {
        const next = { ...prev, type, key };
        if (activeRef.current) {
          void startBackground(type, key, next.volume);
        }
        return next;
      });
    },
    [startBackground],
  );

  useEffect(() => {
    return () => stopBackground(true);
  }, [stopBackground]);

  return {
    layer,
    selectBackground,
    setBackgroundVolume,
    startBackground,
    stopBackground,
  };
}
