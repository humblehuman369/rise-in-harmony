/**
 * natureSynth — Procedural Nature Soundscape Synthesis
 *
 * Generates endless, never-looping nature soundscapes live via the Web Audio API,
 * replacing short MP3 loops whose restart seams were audible (MP3 looping via
 * HTMLAudioElement is never gapless, and several source files had level jumps
 * or trailing silence at the seam).
 *
 * Design principles:
 *  - Every sound is built from noise sources, filters, and LFOs — no samples,
 *    no loops, no repetition. Minute 41 has never been heard before.
 *  - Slow randomized modulation keeps textures organic and mesmerizing.
 *  - Each synth returns a single output GainNode plus a stop() that cleans up
 *    all internal nodes and timers.
 *  - CPU cost is kept low: one or two noise buffers shared per synth, a small
 *    number of biquad filters, and sparse scheduled events (drips, crackles,
 *    chirps, bowl strikes) via lightweight lookahead timers.
 */

export type NatureSynthHandle = {
  /** Connect this to the destination gain node. Already started. */
  output: GainNode;
  /** Stop all sources, clear timers, disconnect everything. */
  stop: () => void;
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Create an AudioBuffer filled with white noise (mono, ~2s, randomized phase). */
function makeNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Create an AudioBuffer of pink-ish noise using the Voss-McCartney-style
 * filtered accumulation (perceptually smoother than white noise).
 */
function makePinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
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
  return buf;
}

/** Brown (red) noise — deep rumble base for fire, cave, deep wind. */
function makeBrownNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  return buf;
}

/** Start a looping noise source. Noise buffers loop invisibly (no seam — noise is self-similar). */
function startNoiseSource(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  // Randomize start offset so two layers never phase-align
  src.start(0, Math.random() * buffer.duration);
  return src;
}

/** Slow sine LFO wired to an AudioParam. Returns the oscillator for cleanup. */
function addLFO(
  ctx: AudioContext,
  param: AudioParam,
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

/** Scheduler for sparse randomized events (drips, chirps, crackles). */
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

// ─── Individual soundscapes ───────────────────────────────────────────────────

function synthRain(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Steady rain bed: white noise → bandpass around 1.8kHz + highshelf rolloff
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
  bed.connect(bp); bp.connect(lp); lp.connect(bedGain); bedGain.connect(out);

  // Slow intensity drift so the rain "breathes"
  const lfo = addLFO(ctx, bedGain.gain, 0.05 + Math.random() * 0.04, 0.12);

  // Occasional heavier droplet spatter: short noise bursts through higher bandpass
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
    src.connect(f); f.connect(g); g.connect(out);
    src.start(now, Math.random() * 0.3, 0.2);
    return 60 + Math.random() * 250; // next droplet in 60–310ms
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

function synthOcean(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Deep water bed: pink noise → lowpass, with slow swell LFO on both gain & filter
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.45;
  bed.connect(lp); lp.connect(bedGain); bedGain.connect(out);

  // Wave swell: ~10s period (0.09Hz), modulates loudness and brightness together
  const swellRate = 0.07 + Math.random() * 0.05;
  const lfo1 = addLFO(ctx, bedGain.gain, swellRate, 0.28);
  const lfo2 = addLFO(ctx, lp.frequency, swellRate, 350);

  // Foamy wash on top: white noise → highpass, slower offset LFO (waves breaking)
  const wash = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1200;
  const washGain = ctx.createGain();
  washGain.gain.value = 0.06;
  wash.connect(hp); hp.connect(washGain); washGain.connect(out);
  const lfo3 = addLFO(ctx, washGain.gain, swellRate * 1.31, 0.05);

  return {
    output: out,
    stop: () => {
      try { bed.stop(); wash.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthWind(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Wind body: pink noise → sweeping bandpass (the classic wind voice)
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 400;
  bp.Q.value = 1.2;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.5;
  bed.connect(bp); bp.connect(bedGain); bedGain.connect(out);

  // Two detuned LFOs on filter frequency → howling sweeps that never repeat exactly
  const lfo1 = addLFO(ctx, bp.frequency, 0.05 + Math.random() * 0.03, 220);
  const lfo2 = addLFO(ctx, bp.frequency, 0.013 + Math.random() * 0.01, 130);
  // Gust intensity
  const lfo3 = addLFO(ctx, bedGain.gain, 0.08 + Math.random() * 0.05, 0.18);

  // High whistle layer, very quiet
  const whistle = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const wf = ctx.createBiquadFilter();
  wf.type = "bandpass";
  wf.frequency.value = 1600;
  wf.Q.value = 14;
  const wg = ctx.createGain();
  wg.gain.value = 0.02;
  whistle.connect(wf); wf.connect(wg); wg.connect(out);
  const lfo4 = addLFO(ctx, wf.frequency, 0.021, 500);

  return {
    output: out,
    stop: () => {
      try { bed.stop(); whistle.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); lfo4.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthFire(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Fire body: brown noise → lowpass rumble with flicker LFO
  const bed = startNoiseSource(ctx, makeBrownNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 450;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.4;
  bed.connect(lp); lp.connect(bedGain); bedGain.connect(out);
  const lfo = addLFO(ctx, bedGain.gain, 0.9 + Math.random() * 0.5, 0.08);

  // Crackles: very short filtered noise bursts at random intervals
  const crackleBuf = makeNoiseBuffer(ctx, 0.3);
  const events = makeEventScheduler(() => {
    const n = 1 + Math.floor(Math.random() * 3); // little crackle clusters
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
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, Math.random() * 0.2, 0.08);
    }
    return 150 + Math.random() * 900; // next crackle cluster in 0.15–1.05s
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

function synthRiver(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Flowing water: two bandpassed white noise layers with shimmering modulation
  const bed1 = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const bp1 = ctx.createBiquadFilter();
  bp1.type = "bandpass";
  bp1.frequency.value = 900;
  bp1.Q.value = 1.0;
  const g1 = ctx.createGain();
  g1.gain.value = 0.28;
  bed1.connect(bp1); bp1.connect(g1); g1.connect(out);
  const lfo1 = addLFO(ctx, bp1.frequency, 0.4 + Math.random() * 0.3, 180);

  const bed2 = startNoiseSource(ctx, makeNoiseBuffer(ctx));
  const bp2 = ctx.createBiquadFilter();
  bp2.type = "bandpass";
  bp2.frequency.value = 2600;
  bp2.Q.value = 1.4;
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  bed2.connect(bp2); bp2.connect(g2); g2.connect(out);
  const lfo2 = addLFO(ctx, bp2.frequency, 0.9 + Math.random() * 0.6, 500);
  const lfo3 = addLFO(ctx, g2.gain, 0.23, 0.05);

  // Low gurgle underneath
  const gurgle = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300;
  const g3 = ctx.createGain();
  g3.gain.value = 0.18;
  gurgle.connect(lp); lp.connect(g3); g3.connect(out);
  const lfo4 = addLFO(ctx, g3.gain, 0.11, 0.06);

  return {
    output: out,
    stop: () => {
      try { bed1.stop(); bed2.stop(); gurgle.stop(); lfo1.stop(); lfo2.stop(); lfo3.stop(); lfo4.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthNight(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Quiet night air: very soft pink noise floor
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.07;
  bed.connect(lp); lp.connect(bedGain); bedGain.connect(out);

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
      osc.connect(g); g.connect(out);
      osc.start(t);
      osc.stop(t + 0.03);
    }
    return 700 + Math.random() * 2500; // next trill in 0.7–3.2s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      try { bed.stop(); } catch {}
      out.disconnect();
    },
  };
}

function synthForest(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Forest air: gentle wind through leaves (soft filtered noise, slow drift)
  const bed = startNoiseSource(ctx, makePinkNoiseBuffer(ctx));
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 0.7;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.16;
  bed.connect(bp); bp.connect(bedGain); bedGain.connect(out);
  const lfo1 = addLFO(ctx, bedGain.gain, 0.06, 0.05);
  const lfo2 = addLFO(ctx, bp.frequency, 0.03, 250);

  // Birdsong: short FM warbles at random pitches & intervals
  const events = makeEventScheduler(() => {
    const start = ctx.currentTime + Math.random() * 0.2;
    const base = 2200 + Math.random() * 2400;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const t = start + i * (0.09 + Math.random() * 0.12);
      const f0 = base * (0.9 + Math.random() * 0.25);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * (1.1 + Math.random() * 0.4), t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.95, t + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.02, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1 + Math.random() * 0.05);
      osc.connect(g); g.connect(out);
      osc.start(t);
      osc.stop(t + 0.2);
    }
    return 1500 + Math.random() * 6000; // next bird in 1.5–7.5s
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

function synthCave(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Cave depth: brown noise → very low lowpass with slow resonant movement
  const bed = startNoiseSource(ctx, makeBrownNoiseBuffer(ctx));
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  lp.Q.value = 2.5;
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.35;
  bed.connect(lp); lp.connect(bedGain); bedGain.connect(out);
  const lfo = addLFO(ctx, lp.frequency, 0.017, 60);

  // Echoing water drips: sine blips with feedback-delay tails
  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  const delayOut = ctx.createGain();
  delayOut.gain.value = 0.5;
  delay.connect(fb); fb.connect(delay);
  delay.connect(delayOut); delayOut.connect(out);

  const events = makeEventScheduler(() => {
    const t = ctx.currentTime + Math.random() * 0.3;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = 800 + Math.random() * 1400;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.5, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g); g.connect(out); g.connect(delay);
    osc.start(t);
    osc.stop(t + 0.15);
    return 2000 + Math.random() * 7000; // next drip in 2–9s
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

function synthBowl(ctx: AudioContext): NatureSynthHandle {
  const out = ctx.createGain();
  out.gain.value = 1;

  // Continuous bowl hum: additive partials matching the DDS 'bowl' timbre
  // (fundamental + inharmonic overtones typical of Himalayan bowls)
  const partials = [
    { ratio: 1, gain: 0.16 },
    { ratio: 2.71, gain: 0.05 },
    { ratio: 5.15, gain: 0.02 },
  ];
  const f0 = 110.5; // warm low bowl fundamental
  const humOscs: OscillatorNode[] = [];
  for (const p of partials) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f0 * p.ratio;
    const g = ctx.createGain();
    g.gain.value = p.gain;
    // Gentle beating between partials — two slightly detuned oscillators
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = f0 * p.ratio * 1.003;
    const g2 = ctx.createGain();
    g2.gain.value = p.gain * 0.6;
    osc.connect(g); g.connect(out);
    osc2.connect(g2); g2.connect(out);
    osc.start(); osc2.start();
    humOscs.push(osc, osc2);
  }

  // Periodic soft strikes with long exponential decay
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
      osc.connect(g); g.connect(out);
      osc.start(t);
      osc.stop(t + 13);
    }
    return 15000 + Math.random() * 20000; // next strike in 15–35s
  });

  return {
    output: out,
    stop: () => {
      events.stop();
      for (const o of humOscs) { try { o.stop(); } catch {} }
      out.disconnect();
    },
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export type SynthNatureSound =
  | "rain" | "ocean" | "forest" | "wind" | "fire"
  | "river" | "night" | "cave" | "bowl";

const SYNTHS: Record<SynthNatureSound, (ctx: AudioContext) => NatureSynthHandle> = {
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

/**
 * Start a procedural nature soundscape. Returns a handle whose `output`
 * GainNode should be connected into the destination graph, and a `stop()`
 * for full cleanup. Returns null for unknown keys.
 */
export function startNatureSynth(
  ctx: AudioContext,
  sound: string,
): NatureSynthHandle | null {
  const factory = SYNTHS[sound as SynthNatureSound];
  if (!factory) return null;
  return factory(ctx);
}
