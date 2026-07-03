/**
 * useChakraJourney — guided 7-chakra sequence engine
 *
 * Steps through CHAKRA_FREQUENCIES (Root 396Hz → Crown 963Hz), playing each
 * chakra's frequency loop for a configurable duration with a ~2.5s crossfade
 * between steps (two expo-audio players, JS-driven volume ramps).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as KeepAwake from "expo-keep-awake";
import { CHAKRA_FREQUENCIES } from "@rih/shared-utils";
import { FREQUENCY_AUDIO_MAP } from "./useAudioPlayer";

const CROSSFADE_MS = 2500;
const FADE_STEP_MS = 100;
const TARGET_VOLUME = 0.75;

interface ChakraJourneyState {
  isRunning: boolean;
  /** Index into CHAKRA_FREQUENCIES (0 = Root … 6 = Crown) */
  currentIndex: number;
  /** Seconds elapsed within the current chakra step */
  elapsedInStep: number;
  isComplete: boolean;
}

export function useChakraJourney(stepDurationSec: number) {
  const currentPlayerRef = useRef<AudioPlayer | null>(null);
  const outgoingPlayerRef = useRef<AudioPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<ChakraJourneyState>({
    isRunning: false,
    currentIndex: 0,
    elapsedInStep: 0,
    isComplete: false,
  });

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const clearFade = useCallback(() => {
    if (fadeRef.current) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const removePlayer = (ref: React.MutableRefObject<AudioPlayer | null>) => {
    if (ref.current) {
      try {
        ref.current.pause();
        ref.current.remove();
      } catch {}
      ref.current = null;
    }
  };

  const teardownAudio = useCallback(() => {
    clearFade();
    removePlayer(currentPlayerRef);
    removePlayer(outgoingPlayerRef);
  }, [clearFade]);

  /** Start playing chakra `index`, crossfading from whatever is playing. */
  const playChakra = useCallback(
    (index: number) => {
      const freq = CHAKRA_FREQUENCIES[index];
      if (!freq) return;
      const source = FREQUENCY_AUDIO_MAP[freq.id];
      if (source === undefined) return;

      clearFade();
      // Any previous outgoing player is done fading — drop it
      removePlayer(outgoingPlayerRef);
      // Current becomes outgoing
      outgoingPlayerRef.current = currentPlayerRef.current;
      currentPlayerRef.current = null;

      const incoming = createAudioPlayer(source);
      incoming.loop = true;
      incoming.volume = 0;
      incoming.play();
      currentPlayerRef.current = incoming;

      const steps = Math.max(1, Math.round(CROSSFADE_MS / FADE_STEP_MS));
      let step = 0;
      fadeRef.current = setInterval(() => {
        step++;
        const t = Math.min(step / steps, 1);
        if (currentPlayerRef.current) currentPlayerRef.current.volume = TARGET_VOLUME * t;
        if (outgoingPlayerRef.current) outgoingPlayerRef.current.volume = TARGET_VOLUME * (1 - t);
        if (t >= 1) {
          clearFade();
          removePlayer(outgoingPlayerRef);
        }
      }, FADE_STEP_MS);
    },
    [clearFade]
  );

  const stop = useCallback(
    (markComplete = false) => {
      clearTick();
      teardownAudio();
      KeepAwake.deactivateKeepAwake().catch(() => {});
      setState((prev) => ({
        ...prev,
        isRunning: false,
        isComplete: markComplete ? true : prev.isComplete,
      }));
    },
    [clearTick, teardownAudio]
  );

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      setState((prev) => {
        const nextElapsed = prev.elapsedInStep + 1;
        if (nextElapsed < stepDurationSec) {
          return { ...prev, elapsedInStep: nextElapsed };
        }
        // Advance to the next chakra
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= CHAKRA_FREQUENCIES.length) {
          setTimeout(() => stop(true), 0);
          return { ...prev, elapsedInStep: stepDurationSec };
        }
        playChakra(nextIndex);
        return { ...prev, currentIndex: nextIndex, elapsedInStep: 0 };
      });
    }, 1000);
  }, [clearTick, stepDurationSec, playChakra, stop]);

  const start = useCallback(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
      interruptionModeAndroid: "doNotMix",
    }).catch(() => {});
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    setState({ isRunning: true, currentIndex: 0, elapsedInStep: 0, isComplete: false });
    playChakra(0);
    startTick();
  }, [playChakra, startTick]);

  const pause = useCallback(() => {
    clearTick();
    currentPlayerRef.current?.pause();
    outgoingPlayerRef.current?.pause();
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTick]);

  const resume = useCallback(() => {
    currentPlayerRef.current?.play();
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    setState((prev) => ({ ...prev, isRunning: true }));
    startTick();
  }, [startTick]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      clearTick();
      teardownAudio();
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [clearTick, teardownAudio]);

  return { ...state, start, pause, resume, stop };
}
