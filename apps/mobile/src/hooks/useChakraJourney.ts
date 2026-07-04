/**
 * useChakraJourney — guided 7-chakra sequence engine
 *
 * Steps through CHAKRA_FREQUENCIES (Root 396Hz → Crown 963Hz), synthesizing
 * each chakra's exact frequency live (react-native-audio-api oscillators)
 * for a configurable duration, with a ~2.5s crossfade between steps done as
 * native gain ramps (incoming voice fades in while the outgoing fades out).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as KeepAwake from "expo-keep-awake";
import { CHAKRA_FREQUENCIES } from "@rih/shared-utils";
import { createCatalogVoice, type SynthVoice } from "@/lib/synth";

const CROSSFADE_SEC = 2.5;
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
  const voiceRef = useRef<SynthVoice | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const teardownAudio = useCallback((fadeOutSec = 0.4) => {
    if (voiceRef.current) {
      voiceRef.current.stop(fadeOutSec);
      voiceRef.current = null;
    }
  }, []);

  /** Start playing chakra `index`, crossfading from whatever is playing. */
  const playChakra = useCallback(
    (index: number, fadeSec = CROSSFADE_SEC) => {
      const freq = CHAKRA_FREQUENCIES[index];
      if (!freq) return;

      // Outgoing voice fades out over the same window the incoming fades in
      teardownAudio(fadeSec);

      const incoming = createCatalogVoice(freq, TARGET_VOLUME);
      incoming.start(fadeSec);
      voiceRef.current = incoming;
    },
    [teardownAudio]
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
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    setState({ isRunning: true, currentIndex: 0, elapsedInStep: 0, isComplete: false });
    playChakra(0, 1.5);
    startTick();
  }, [playChakra, startTick]);

  const pause = useCallback(() => {
    clearTick();
    // Oscillator voices can't pause — fade out and recreate on resume
    teardownAudio(0.3);
    KeepAwake.deactivateKeepAwake().catch(() => {});
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTick, teardownAudio]);

  const resume = useCallback(() => {
    KeepAwake.activateKeepAwakeAsync().catch(() => {});
    setState((prev) => {
      playChakra(prev.currentIndex, 1);
      return { ...prev, isRunning: true };
    });
    startTick();
  }, [playChakra, startTick]);

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
