/**
 * Tests for the audio output route classifier (drives binaural hints and the
 * "playing via …" label across iOS and Android device category strings).
 */
import {
  classifyOutput,
  supportsBinaural,
  binauralRouteHint,
  outputLabel,
} from "../src/lib/audioRoute";

describe("classifyOutput", () => {
  it("classifies iOS AVAudioSession port types", () => {
    expect(classifyOutput("Headphones")).toBe("headphones");
    expect(classifyOutput("BluetoothA2DPOutput")).toBe("bluetooth");
    expect(classifyOutput("AirPlay")).toBe("external");
    expect(classifyOutput("HDMIOutput")).toBe("external");
    expect(classifyOutput("USBAudio")).toBe("external");
    expect(classifyOutput("Speaker")).toBe("speaker");
    expect(classifyOutput("Receiver")).toBe("speaker");
  });

  it("classifies Android device type names", () => {
    expect(classifyOutput("Wired Headphones")).toBe("headphones");
    expect(classifyOutput("Wired Headset")).toBe("headphones");
    expect(classifyOutput("Bluetooth A2DP")).toBe("bluetooth");
    expect(classifyOutput("Bluetooth SCO")).toBe("bluetooth");
    expect(classifyOutput("Built-in Speaker")).toBe("speaker");
  });

  it("returns unknown for missing/unrecognized categories", () => {
    expect(classifyOutput(undefined)).toBe("unknown");
    expect(classifyOutput("")).toBe("unknown");
    expect(classifyOutput("SomeFutureDevice")).toBe("unknown");
  });
});

describe("supportsBinaural", () => {
  it("only headphones and bluetooth can deliver discrete L/R", () => {
    expect(supportsBinaural("headphones")).toBe(true);
    expect(supportsBinaural("bluetooth")).toBe(true);
    expect(supportsBinaural("speaker")).toBe(false);
    expect(supportsBinaural("external")).toBe(false);
    expect(supportsBinaural("unknown")).toBe(false);
  });
});

describe("user-facing strings", () => {
  it("suggests isochronic mode on speakers", () => {
    expect(binauralRouteHint("speaker")).toContain("Isochronic");
    expect(binauralRouteHint("external")).toContain("Isochronic");
  });

  it("confirms good outputs", () => {
    expect(binauralRouteHint("headphones")).toContain("perfect");
  });

  it("labels outputs, preferring the OS device name", () => {
    expect(outputLabel("bluetooth", "AirPods Pro")).toBe("AirPods Pro");
    expect(outputLabel("bluetooth")).toBe("Bluetooth");
    expect(outputLabel("speaker")).toBe("Phone speaker");
  });
});
