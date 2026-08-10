/**
 * playFallbackAudio — unit tests
 *
 * Tests the audio fallback function exported from useMissedAlarms.
 * expo-audio requires native modules that don't exist in Jest, so we must
 * mock the entire module. We expose the mock functions as module-level
 * variables so tests can inspect calls and simulate failures.
 */

// ─── Mock expo-audio with spyable functions ───────────────────────────────────
// We define the mock functions at module scope so tests can access them.
// The mock factory must return an object with the same shape as expo-audio.
const mockPlay = jest.fn();
const mockPause = jest.fn();
// spyPlayer is reassigned in beforeEach; tests read it after calling the fn.
let spyPlayer = { loop: false, volume: 1, play: mockPlay, pause: mockPause };
const mockCreateAudioPlayer = jest.fn(() => spyPlayer);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
}));

import { playFallbackAudio } from "../src/hooks/useMissedAlarms";

describe("playFallbackAudio — Expo AV audio fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    spyPlayer = { loop: false, volume: 1, play: mockPlay, pause: mockPause };
    mockCreateAudioPlayer.mockImplementation(() => spyPlayer);
    mockSetAudioModeAsync.mockResolvedValue(undefined);
  });

  it("calls setAudioModeAsync with playsInSilentMode: true", async () => {
    await playFallbackAudio(528);
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: true })
    );
  });

  it("calls setAudioModeAsync with shouldPlayInBackground: true", async () => {
    await playFallbackAudio(528);
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ shouldPlayInBackground: true })
    );
  });

  it("calls setAudioModeAsync with interruptionMode: doNotMix", async () => {
    await playFallbackAudio(528);
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionMode: "doNotMix" })
    );
  });

  it("creates an AudioPlayer and returns it", async () => {
    const player = await playFallbackAudio(528);
    expect(player).not.toBeNull();
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it("calls player.play()", async () => {
    await playFallbackAudio(528);
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it("sets player.volume to 0.85", async () => {
    await playFallbackAudio(528);
    expect(spyPlayer.volume).toBe(0.85);
  });

  it("sets player.loop to true", async () => {
    await playFallbackAudio(528);
    expect(spyPlayer.loop).toBe(true);
  });

  it("returns null without throwing when setAudioModeAsync rejects", async () => {
    mockSetAudioModeAsync.mockRejectedValue(new Error("Audio session unavailable"));
    const player = await playFallbackAudio(528);
    expect(player).toBeNull();
  });

  it("returns null without throwing when createAudioPlayer throws", async () => {
    mockCreateAudioPlayer.mockImplementation(() => {
      throw new Error("Native module not available");
    });
    const player = await playFallbackAudio(528);
    expect(player).toBeNull();
  });

  it("falls back to 528Hz asset for an unrecognised frequency (999Hz)", async () => {
    // 999Hz is not in BUNDLED_ALARM_SOUNDS — should use FALLBACK_HZ (528) without throwing
    const player = await playFallbackAudio(999);
    expect(player).not.toBeNull();
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it("uses a known bundled asset for 174Hz", async () => {
    const player = await playFallbackAudio(174);
    expect(player).not.toBeNull();
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });

  it("uses a known bundled asset for 963Hz", async () => {
    const player = await playFallbackAudio(963);
    expect(player).not.toBeNull();
    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
  });
});
