/**
 * useAudioOutput — live audio output route detection.
 *
 * Reports what the audio is currently playing through (wired headphones,
 * Bluetooth, external hi-fi output, or the phone speaker) and re-checks
 * whenever the system route changes (headphones plugged in, AirPods
 * connected, AirPlay selected, …).
 */
import { useEffect, useState } from "react";
import { AudioManager } from "react-native-audio-api";
import { classifyOutput, type OutputKind } from "@/lib/audioRoute";

export interface AudioOutputInfo {
  kind: OutputKind;
  /** Device name as reported by the OS (e.g. "Brad's AirPods Pro") */
  name: string | null;
}

export function useAudioOutput(): AudioOutputInfo {
  const [output, setOutput] = useState<AudioOutputInfo>({
    kind: "unknown",
    name: null,
  });

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const info = await AudioManager.getDevicesInfo();
        const current = info.currentOutputs?.[0];
        if (mounted) {
          setOutput({
            kind: classifyOutput(current?.category),
            name: current?.name ?? null,
          });
        }
      } catch {
        // Device info unavailable (e.g. simulator edge cases) — keep "unknown"
      }
    };

    refresh();
    const sub = AudioManager.addSystemEventListener("routeChange", refresh);
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  return output;
}
