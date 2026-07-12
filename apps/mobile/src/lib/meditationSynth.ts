/**
 * meditationSynth — Procedural Nature & Music Synthesis for Meditation
 *
 * Generates endless, never-looping soundscapes using the DDS engine
 * (react-native-audio-api AudioContext). Eliminates the audible loop seam
 * caused by short MP3 files + expo-audio's `loop = true`.
 *
 * Design principles:
 *  - Every sound is built from noise buffers, oscillators, filters, and LFOs
 *  - Slow randomized modulation keeps textures organic and non-repeating
 *  - Each synth returns a single output GainNode + stop() for full cleanup
 *  - CPU cost is kept low: shared noise buffers, sparse scheduled events
 *
 * Supported soundscapes: night, rain, ocean, wind, fire, river, forest, cave
 * Supported music modes: drone, ambient, crystal
 */
import {
  AudioContext,
  type GainNode,
  type OscillatorNode,
} from "react-native-audio-api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProceduralSynthHandle = {
  /** Connect this output node to your destination/gain. Already started. */
  output: GainNode;
  /** Stop all sources, clear timers, disconnect everything. */
  stop: () => void;
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────

/** Create a noise-filled AudioBuffer (white noise, mono). */
function makeNoiseBuffer(ctx: AudioContext, seconds = 2): any {
  const sampleRate = ctx.sampleRate;
  const len = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Pink noise buffer using Voss-McCartney filtering. */
function makePinkNoiseBuffer(ctx: AudioContext, seconds = 4): any {
  const sampleRate = ctx.sampleRate;
  const len = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    data[i] = pink * 0.11;
  }
  return buffer;
}

/** Brown (red) noise — deep rumble base. */
function makeBrownNoiseBuffer(ctx: AudioContext, seconds = 4): any {
  const sampleRate = ctx.sampleRate;
  const len = Math.floor(sampleRate * seconds);
  const buffer = ctx.createBuffer(1, len, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

/** Start a looping noise buffer source (noise loops invisibly — self-similar). */
function startNoiseSource(ctx: AudioContext, buffer: any): any {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start(0, Math.random() * (buffer.duration || 2));
  return src;
}

/** Slow sine LFO wired to an AudioParam. Returns the oscillator for cleanup. */
function addLFO(
  ctx: AudioContext,
  param: any,
  rateHz: number,
  depth: number,
): OscillatorNode {
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = rateHz;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = depth;
  lfo.connect(lfoGain);
  lfoGain.connect(param);
  lfo.start();
  return lfo;
}

/** Scheduler for sparse randomized events (cricket chirps, crackles, drips). */
function makeEventScheduler(fn: () => number): { stop: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    const nextMs = fn();
    timer = setTimeout(tick, nextMs);
  };
  timer = setTimeout(tick, 100);
  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

// ─── Nature Soundscapes ──────────────────────────────────────────────────────

function synthNight(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Quiet night air: very soft pink noise floor
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.07;
  bed.connect(lp);
  lp.connect(bedGain);
  bedGain.connect(out);

  // Crickets: pulsed sine chirps around 4.2–4.6kHz in trill groups
  const events = makeEventScheduler(() => {
    const baseFreq = 4200 + Math.random() * 400;
    const pulses = 6 + Math.floor(Math.random() * 8);
    const pulseGap = 0.028 + Math.random() * 0.012;
    const start = ctx.currentTime + Math.random() * 0.1;
    for (let i = 0; i < pulses; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = baseFreq;
      const g = ctx.createGain();
      const t = start + i * pulseGap;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025 + Math.random() * 0.015, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.03);
    }
    return 700 + Math.random() * 2500; // next trill in 0.7–3.2s
  });

  // Occasional distant owl hoot: low sine with gentle vibrato
  const owlEvents = makeEventScheduler(() => {
    const t = ctx.currentTime + Math.random() * 0.5;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 280 + Math.random() * 40;
    const vibrato = ctx.createOscillator();
    vibrato.type = "sine";
    vibrato.frequency.value = 5;
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.value = 8;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.015, t + 0.3);
    g.gain.linearRampToValueAtTime(0.012, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 1.6);
    vibrato.start(t);
    vibrato.stop(t + 1.6);
    return 25000 + Math.random() * 45000; // next hoot in 25–70s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      owlEvents.stop();
      try { bed.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthRain(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Steady rain bed: white noise → bandpass + lowpass
  const bed = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.5;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6000;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.5;
  bed.connect(bp);
  bp.connect(lp);
  lp.connect(bedGain);
  bedGain.connect(out);

  // Slow intensity drift
  const lfo = addLFO(ctx, bedGain.gain, 0.05 + Math.random() * 0.04, 0.12);

  // Droplet spatters
  const dropletBuf = makeNoiseBuffer(ctx, 0.5);
  const events = makeEventScheduler(() => {
    const src = ctx.createBufferSource();
    src.buffer = dropletBuf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3000 + Math.random() * 4000;
    f.Q.value = 8;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.10 + Math.random() * 0.10, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06 + Math.random() * 0.08);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(now, Math.random() * 0.3, 0.2);
    return 60 + Math.random() * 250;
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      try { bed.stop(); lfo.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthOcean(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Deep water bed: pink noise → lowpass with wave swell LFO
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.45;
  bed.connect(lp);
  lp.connect(bedGain);
  bedGain.connect(out);

  const swellRate = 0.07 + Math.random() * 0.05;
  const lfo1 = addLFO(ctx, bedGain.gain, swellRate, 0.28);
  const lfo2 = addLFO(ctx, lp.frequency, swellRate, 350);

  // Foamy wash on top
  const wash = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1200;
  const washGain = ctx.createGain();
  washGain.gain.value = 0.06;
  wash.connect(hp);
  hp.connect(washGain);
  washGain.connect(out);
  const lfo3 = addLFO(ctx, washGain.gain, swellRate * 1.31, 0.05);

  return {
    output: out,
    stop: () => {
      try { bed.stop(); wash.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthWind(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 400;
  bp.Q.value = 1.2;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.5;
  bed.connect(bp);
  bp.connect(bedGain);
  bedGain.connect(out);

  const lfo1 = addLFO(ctx, bp.frequency, 0.05 + Math.random() * 0.03, 220);
  const lfo2 = addLFO(ctx, bp.frequency, 0.013 + Math.random() * 0.01, 130);
  const lfo3 = addLFO(ctx, bedGain.gain, 0.08 + Math.random() * 0.05, 0.18);

  // High whistle layer
  const whistle = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const wf = ctx.createBiquadFilter();
  wf.type = "bandpass";
  wf.frequency.value = 1600;
  wf.Q.value = 14;
  const wg = ctx.createGain();
  wg.gain.value = 0.02;
  whistle.connect(wf);
  wf.connect(wg);
  wg.connect(out);
  const lfo4 = addLFO(ctx, wf.frequency, 0.021, 500);

  return {
    output: out,
    stop: () => {
      try { bed.stop(); whistle.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); lfo4.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthFire(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  const bed = startNoiseSource(ctx, makeBrownNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 450;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.4;
  bed.connect(lp);
  lp.connect(bedGain);
  bedGain.connect(out);
  const lfo = addLFO(ctx, bedGain.gain, 0.9 + Math.random() * 0.5, 0.08);

  // Crackles
  const crackleBuf = makeNoiseBuffer(ctx, 0.3);
  const events = makeEventScheduler(() => {
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const src = ctx.createBufferSource();
      src.buffer = crackleBuf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1500 + Math.random() * 5000;
      f.Q.value = 3;
      const g = ctx.createGain();
      const t = ctx.currentTime + i * (0.02 + Math.random() * 0.05);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.15 + Math.random() * 0.25, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.04);
      src.connect(f);
      f.connect(g);
      g.connect(out);
      src.start(t, Math.random() * 0.2, 0.08);
    }
    return 150 + Math.random() * 900;
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      try { bed.stop(); lfo.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthRiver(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  const bed1 = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const bp1 = ctx.createBiquadFilter();
  bp1.type = "bandpass";
  bp1.frequency.value = 900;
  bp1.Q.value = 1.0;
  const g1 = ctx.createGain();
  g1.gain.value = 0.28;
  bed1.connect(bp1);
  bp1.connect(g1);
  g1.connect(out);
  const lfo1 = addLFO(ctx, bp1.frequency, 0.4 + Math.random() * 0.3, 180);

  const bed2 = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const bp2 = ctx.createBiquadFilter();
  bp2.type = "bandpass";
  bp2.frequency.value = 2600;
  bp2.Q.value = 1.4;
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  bed2.connect(bp2);
  bp2.connect(g2);
  g2.connect(out);
  const lfo2 = addLFO(ctx, bp2.frequency, 0.9 + Math.random() * 0.6, 500);
  const lfo3 = addLFO(ctx, g2.gain, 0.23, 0.05);

  // Low gurgle
  const gurgle = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lpGurgle = ctx.createBiquadFilter();
  lpGurgle.type = "lowpass";
  lpGurgle.frequency.value = 300;
  const g3 = ctx.createGain();
  g3.gain.value = 0.18;
  gurgle.connect(lpGurgle);
  lpGurgle.connect(g3);
  g3.connect(out);
  const lfo4 = addLFO(ctx, g3.gain, 0.11, 0.06);

  return {
    output: out,
    stop: () => {
      try { bed1.stop(); bed2.stop(); gurgle.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); lfo4.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthForest(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 0.7;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.16;
  bed.connect(bp);
  bp.connect(bedGain);
  bedGain.connect(out);
  const lfo1 = addLFO(ctx, bedGain.gain, 0.06, 0.05);
  const lfo2 = addLFO(ctx, bp.frequency, 0.03, 250);

  // Birdsong: short FM warbles
  const events = makeEventScheduler(() => {
    const start = ctx.currentTime + Math.random() * 0.2;
    const base = 2200 + Math.random() * 2400;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const noteFreq = base * (1 + (Math.random() - 0.5) * 0.3);
      osc.frequency.value = noteFreq;
      const g = ctx.createGain();
      const t = start + i * (0.06 + Math.random() * 0.08);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.015, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + Math.random() * 0.04);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 0.12);
    }
    return 2000 + Math.random() * 6000; // next bird in 2–8s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      try { bed.stop(); lfo1.stop(); lfo2.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthCave(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Deep resonant space: brown noise → very low pass
  const bed = startNoiseSource(ctx, makeBrownNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 200;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.3;
  bed.connect(lp);
  lp.connect(bedGain);
  bedGain.connect(out);
  const lfo = addLFO(ctx, lp.frequency, 0.02, 60);

  // Water drips
  const events = makeEventScheduler(() => {
    const t = ctx.currentTime + Math.random() * 0.3;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1800 + Math.random() * 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15 + Math.random() * 0.2);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.4);
    return 1500 + Math.random() * 5000; // next drip in 1.5–6.5s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      try { bed.stop(); lfo.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthBowl(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Singing bowl: sustained harmonics with slow beating
  const f0 = 220 + Math.random() * 30; // ~A3 with slight randomization
  const partials = [
    { ratio: 1, gain: 0.15 },
    { ratio: 2.71, gain: 0.10 },
    { ratio: 4.77, gain: 0.06 },
    { ratio: 7.22, gain: 0.03 },
  ];

  const oscs: OscillatorNode[] = [];
  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f0 * p.ratio;
    const g = ctx.createGain();
    g.gain.value = p.gain;
    // Beating: slightly detuned second oscillator
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = f0 * p.ratio * 1.003;
    const g2 = ctx.createGain();
    g2.gain.value = p.gain * 0.6;
    osc.connect(g);
    g.connect(out);
    osc2.connect(g2);
    g2.connect(out);
    osc.start();
    osc2.start();
    oscs.push(osc, osc2);
  }

  // Periodic soft strikes with long decay
  const events = makeEventScheduler(() => {
    const t = ctx.currentTime + 0.05;
    for (const p of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f0 * p.ratio * (0.999 + Math.random() * 0.002);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.gain * 1.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 8 + Math.random() * 4);
      osc.connect(g);
      g.connect(out);
      osc.start(t);
      osc.stop(t + 13);
    }
    return 15000 + Math.random() * 20000; // next strike in 15–35s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      for (const o of oscs) { try { o.stop(); } catch {} }
      out.disconnect();
    },
  };
}

// ─── Music Modes (Procedural) ────────────────────────────────────────────────

/**
 * Procedural drone: deep sine harmonics with slow beating and gentle
 * amplitude modulation. Creates an infinite, evolving pad that never loops.
 */
function synthDrone(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Root frequency: C2 area (~65Hz) for deep, grounding drone
  const root = 65.41; // C2
  const harmonics = [
    { ratio: 1, gain: 0.20, detuneCents: 0 },
    { ratio: 1.5, gain: 0.12, detuneCents: 3 },     // perfect fifth
    { ratio: 2, gain: 0.10, detuneCents: -2 },       // octave
    { ratio: 3, gain: 0.05, detuneCents: 5 },        // octave + fifth
    { ratio: 4, gain: 0.03, detuneCents: -4 },       // 2 octaves
    { ratio: 5.04, gain: 0.02, detuneCents: 7 },     // major third (slightly sharp)
  ];

  const oscs: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];

  for (const h of harmonics) {
    // Main oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = root * h.ratio;
    osc.detune.value = h.detuneCents;
    const g = ctx.createGain();
    g.gain.value = h.gain;
    osc.connect(g);
    g.connect(out);
    osc.start();
    oscs.push(osc);

    // Beating partner (slightly detuned)
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = root * h.ratio;
    osc2.detune.value = h.detuneCents + (2 + Math.random() * 4); // 2–6 cents sharp
    const g2 = ctx.createGain();
    g2.gain.value = h.gain * 0.7;
    osc2.connect(g2);
    g2.connect(out);
    osc2.start();
    oscs.push(osc2);

    // Slow amplitude LFO for organic breathing (different rate per harmonic)
    const lfoRate = 0.02 + Math.random() * 0.04; // 0.02–0.06 Hz (17–50s period)
    const lfo = addLFO(ctx, g.gain, lfoRate, h.gain * 0.3);
    lfos.push(lfo);
  }

  // Very slow master swell (ultra-long period)
  const masterLfo = addLFO(ctx, out.gain, 0.008 + Math.random() * 0.005, 0.15);
  lfos.push(masterLfo);

  return {
    output: out,
    stop: () => {
      for (const o of oscs) { try { o.stop(); } catch {} }
      for (const l of lfos) { try { l.stop(); } catch {} }
      out.disconnect();
    },
  };
}

/**
 * Procedural ambient: layered sine pads with slow chord movement,
 * shimmer, and reverb-like diffusion via detuned copies.
 */
function synthAmbient(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Chord tones: Am7 voicing (A2, C3, E3, G3, B3) with slow drift
  const chordFreqs = [110, 130.81, 164.81, 196, 246.94];
  const oscs: OscillatorNode[] = [];
  const lfos: OscillatorNode[] = [];

  for (let i = 0; i < chordFreqs.length; i++) {
    const freq = chordFreqs[i];
    // Main tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.06;
    osc.connect(g);
    g.connect(out);
    osc.start();
    oscs.push(osc);

    // Shimmer copy (octave up, very quiet, detuned)
    const shimmer = ctx.createOscillator();
    shimmer.type = "sine";
    shimmer.frequency.value = freq * 2;
    shimmer.detune.value = 5 + Math.random() * 10;
    const sg = ctx.createGain();
    sg.gain.value = 0.015;
    shimmer.connect(sg);
    sg.connect(out);
    shimmer.start();
    oscs.push(shimmer);

    // Slow amplitude drift per voice
    const lfo = addLFO(ctx, g.gain, 0.015 + Math.random() * 0.02, 0.025);
    lfos.push(lfo);
  }

  // Soft noise wash for "air"
  const wash = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const washLp = ctx.createBiquadFilter();
  washLp.type = "lowpass";
  washLp.frequency.value = 400;
  const washGain = ctx.createGain();
  washGain.gain.value = 0.03;
  wash.connect(washLp);
  washLp.connect(washGain);
  washGain.connect(out);

  return {
    output: out,
    stop: () => {
      for (const o of oscs) { try { o.stop(); } catch {} }
      for (const l of lfos) { try { l.stop(); } catch {} }
      try { wash.stop(); } catch {}
      out.disconnect();
    },
  };
}

/**
 * Procedural crystal: high-register sine tones with bell-like envelopes
 * and long reverb tails, creating an ethereal soundscape.
 */
function synthCrystal(ctx: AudioContext): ProceduralSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Sustained crystal bed: high sine cluster with beating
  const crystalFreqs = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6
  const oscs: OscillatorNode[] = [];

  for (const freq of crystalFreqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0.025;
    osc.connect(g);
    g.connect(out);
    osc.start();
    oscs.push(osc);

    // Beating partner
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 1.002;
    const g2 = ctx.createGain();
    g2.gain.value = 0.015;
    osc2.connect(g2);
    g2.connect(out);
    osc2.start();
    oscs.push(osc2);
  }

  // Periodic chime strikes
  const events = makeEventScheduler(() => {
    const t = ctx.currentTime + Math.random() * 0.2;
    const freq = crystalFreqs[Math.floor(Math.random() * crystalFreqs.length)];
    const strikeFreq = freq * (1 + (Math.random() - 0.5) * 0.02);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = strikeFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4 + Math.random() * 3);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 8);
    return 3000 + Math.random() * 8000; // next chime in 3–11s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      for (const o of oscs) { try { o.stop(); } catch {} }
      out.disconnect();
    },
  };
}

// ─── Factory Maps ────────────────────────────────────────────────────────────

export type ProceduralNatureSound =
  | "rain" | "ocean" | "forest" | "wind" | "fire"
  | "river" | "night" | "cave" | "bowl";

export type ProceduralMusicMode = "drone" | "ambient" | "crystal";

const NATURE_SYNTHS: Record<ProceduralNatureSound, (ctx: AudioContext) => ProceduralSynthHandle> = {
  rain: synthRain,
  ocean: synthOcean,
  forest: synthForest,
  wind: synthWind,
  fire: synthFire,
  river: synthRiver,
  night: synthNight,
  cave: synthCave,
  bowl: synthBowl,
};

const MUSIC_SYNTHS: Record<ProceduralMusicMode, (ctx: AudioContext) => ProceduralSynthHandle> = {
  drone: synthDrone,
  ambient: synthAmbient,
  crystal: synthCrystal,
};

/**
 * Start a procedural nature soundscape. Returns a handle whose `output`
 * GainNode should be connected into the destination graph, and a `stop()`
 * for full cleanup. Returns null for unknown keys or "silence".
 */
export function startNatureSynth(
  ctx: AudioContext,
  sound: string,
): ProceduralSynthHandle | null {
  if (sound === "silence") return null;
  const factory = NATURE_SYNTHS[sound as ProceduralNatureSound];
  if (!factory) return null;
  return factory(ctx);
}

/**
 * Start a procedural music bed. Returns a handle whose `output`
 * GainNode should be connected into the destination graph, and a `stop()`
 * for full cleanup. Returns null for unknown keys.
 */
export function startMusicSynth(
  ctx: AudioContext,
  mode: string,
): ProceduralSynthHandle | null {
  const factory = MUSIC_SYNTHS[mode as ProceduralMusicMode];
  if (!factory) return null;
  return factory(ctx);
}
