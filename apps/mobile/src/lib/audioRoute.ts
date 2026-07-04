/**
 * Audio output route classification — pure logic, unit-testable.
 *
 * Device category strings come from react-native-audio-api's
 * AudioManager.getDevicesInfo():
 *   iOS   → AVAudioSession port types ("Headphones", "Speaker",
 *           "BluetoothA2DPOutput", "AirPlay", "HDMIOutput", …)
 *   Android → readable names ("Built-in Speaker", "Wired Headphones",
 *           "Bluetooth A2DP", "Bluetooth SCO", …)
 */

export type OutputKind =
  /** Wired headphones/headset — ideal for binaural */
  | "headphones"
  /** Stereo Bluetooth (A2DP/LE) — earbuds or a BT speaker, can't tell apart */
  | "bluetooth"
  /** External hi-fi output: AirPlay, HDMI, USB, line-out */
  | "external"
  /** The phone's built-in speaker or earpiece */
  | "speaker"
  | "unknown";

export function classifyOutput(category: string | undefined): OutputKind {
  if (!category) return "unknown";
  const c = category.toLowerCase();
  if (c.includes("headphone") || c.includes("headset")) return "headphones";
  if (c.includes("bluetooth")) return "bluetooth";
  if (
    c.includes("airplay") ||
    c.includes("hdmi") ||
    c.includes("usb") ||
    c.includes("lineout") ||
    c.includes("line out")
  ) {
    return "external";
  }
  if (c.includes("speaker") || c.includes("receiver") || c.includes("earpiece")) {
    return "speaker";
  }
  return "unknown";
}

/** Can this output deliver a real binaural effect (discrete L/R to each ear)? */
export function supportsBinaural(kind: OutputKind): boolean {
  // Bluetooth counts: A2DP is stereo and is how all wireless earbuds connect.
  // (A BT speaker also reports A2DP — messaging notes that caveat.)
  return kind === "headphones" || kind === "bluetooth";
}

/** Short user-facing hint for the binaural mode given the current output. */
export function binauralRouteHint(kind: OutputKind): string {
  switch (kind) {
    case "headphones":
      return "🎧 Headphones connected — perfect for binaural beats.";
    case "bluetooth":
      return "🎧 Bluetooth audio (hi-fi A2DP). Binaural works on earbuds & headphones — not on speakers.";
    case "external":
      return "📢 External speaker output — binaural needs headphones. Try Isochronic mode instead.";
    case "speaker":
      return "🔈 Phone speaker — binaural needs headphones. Try Isochronic mode instead.";
    case "unknown":
      return "🎧 Headphones required for the binaural effect.";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/** Short label for the current output, shown next to the volume control. */
export function outputLabel(kind: OutputKind, name?: string): string {
  switch (kind) {
    case "headphones":
      return "Wired headphones";
    case "bluetooth":
      return name || "Bluetooth";
    case "external":
      return name || "External output";
    case "speaker":
      return "Phone speaker";
    case "unknown":
      return "Audio output";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
