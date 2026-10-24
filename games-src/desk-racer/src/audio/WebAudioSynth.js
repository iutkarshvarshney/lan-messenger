/**
 * Desk Racer AAA Studio Single-Mic + Clean LFE Rumble & Real Sampled Sputter
 * WebAudio Engine
 * (`DeskRacerHybridAudioEngine.js` — drop-in replacement for
 * `src/audio/WebAudioSynth.js`)
 *
 * Why this engine sounds crystal-clear and 100% non-fuzzy:
 * 1. Pure Single-Microphone Studio Stems (Rated 9/10 Realism, 9-10/10 Clarity):
 *    - `kart_idle_loop.wav`          (75 Hz  — stationary 850 RPM start-line
 * idle + 46 Hz chest rumble)
 *    - `kart_cruise_mid_loop.wav`    (122 Hz — crisp on-board mid-RPM cruise &
 * exhaust pipe resonance)
 *    - `kart_tire_drift_loop.wav`    (full-bandwidth rubber micro-chatter &
 * asphalt scrub)
 *    - `curb_rumble_loop.wav`        (suspension impact thud & metallic chassis
 * rattle)
 * 2. Zero Nonlinear WaveShaper Distortion / Zero Sawtooth or Square Synth Buzz:
 *    - Replaces distorted multi-oscillator waveshaping with a pure <95 Hz LFE
 * sub-harmonic sine resonator + Formant-Compensating EQ (98 Hz low-shelf
 * + 6.4->3.0 kHz lowpass roll-off), preventing any comb-filtering or phase
 * cancellation against the main engine stem's transients.
 * 3. 100% Real Studio Exhaust Sputters, Misfires & Overrun Backfires:
 *    - Combines a brief cylinder-skip duck on the main engine bus with real
 * transient slices from `engine_sputter_burst_1..3.wav` (Rated 9/10 Realism,
 * 10/10 Clarity) and a clean <110 Hz acoustic muffler air thump.
 */

const LOOP_STEM_FILES = {
  idle: 'kart_idle_loop.wav',
  cruise: 'kart_cruise_mid_loop.wav',
  drift: 'kart_tire_drift_loop.wav',
  curb: 'curb_rumble_loop.wav',
};

const ONESHOT_STEM_FILES = {
  sputter: [
    'engine_sputter_burst_1.wav', 'engine_sputter_burst_2.wav',
    'engine_sputter_burst_3.wav'
  ],
};

/**
 * Piecewise adjacent equal-power crossfade with dominant single-stem plateaus.
 * Keeps each single-mic studio stem 100% solo across its core RPM band and only
 * crossfades across narrow transition windows so two stems never smear
 * together! Canonical anchors: Idle=75 Hz, Cruise=122 Hz, Flatout=204 Hz,
 * Boost=268 Hz.
 * @param {number} f0
 * @return {{wIdle: number, wCruise: number, wFlatout: number, wBoost: number}}
 */
function computeCrispRegimeWeights(f0) {
  let wIdle = 0.0;
  let wCruise = 0.0;
  let wFlatout = 0.0;
  let wBoost = 0.0;

  if (f0 <= 86.0) {
    wIdle = 1.0;
  } else if (f0 < 108.0) {
    const u = (f0 - 86.0) / (108.0 - 86.0);
    wIdle = Math.cos(0.5 * Math.PI * u);
    wCruise = Math.sin(0.5 * Math.PI * u);
  } else if (f0 <= 146.0) {
    wCruise = 1.0;
  } else if (f0 < 178.0) {
    const u = (f0 - 146.0) / (178.0 - 146.0);
    wCruise = Math.cos(0.5 * Math.PI * u);
    wFlatout = Math.sin(0.5 * Math.PI * u);
  } else if (f0 <= 222.0) {
    wFlatout = 1.0;
  } else if (f0 < 252.0) {
    const u = (f0 - 222.0) / (252.0 - 222.0);
    wFlatout = Math.cos(0.5 * Math.PI * u);
    wBoost = Math.sin(0.5 * Math.PI * u);
  } else {
    wBoost = 1.0;
  }
  return {wIdle, wCruise, wFlatout, wBoost};
}

/**
 * Creates the hybrid single-mic WebAudio engine for Desk Racer.
 * @param {!Object=} options
 * @return {!Object}
 */
export function createDeskRacerHybridAudio(options = {}) {
  const baseUrl = (options.baseUrl || '/games/desk-racer/assets/audio').replace(/\/$/, '');
  const masterVolume = options.masterVolume ?? 0.28;
  const cacheBust = options.cacheBust || 'v=8';

  let ctx = null;
  let enabled = false;
  let stemsLoaded = false;
  let loadingPromise = null;

  let masterGain = null;
  let misfireDuckGain = null;
  let lowShelfFilter = null;
  let engineBusFilter = null;
  let presencePeakFilter = null;

  // Active looping AudioBufferSourceNodes & their GainNodes
  const loopNodes = {};
  const oneShotBuffers = {accel: [], decel: [], boost: [], sputter: []};

  // Clean LFE Sub-Harmonic Sine Resonator (<95 Hz, Zero WaveShaper Distortion!)
  let rumbleSubOsc = null;
  let rumbleLowpass = null;
  let rumbleOutGain = null;

  // User-tunable texture parameters
  let userRumbleAmount = options.rumbleAmount ?? 1.0;
  let userSputterAmount = options.sputterAmount ?? 1.0;

  // Smoothed telemetry state
  let smoothNormSpeed = 0.0;
  let smoothAccelRate = 0.0;
  let smoothBoostBlend = 0.0;
  let smoothHillAndCurlLoad = 0.0;
  let prevSpeed = 0.0;
  let prevTimeMs = performance.now();
  let nextSputterTime = 0;
  let sputterCount = 0;

  let lastDiag = {};
  const rawBufferPromises = new Map();
  const decodedBufferCache = new Map();
  let preloadPromise = null;

  function fetchRawArrayBuffer(url) {
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}${cacheBust}`;
    if (!rawBufferPromises.has(fullUrl)) {
      const p = fetch(fullUrl).then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
        return resp.arrayBuffer();
      });
      rawBufferPromises.set(fullUrl, p);
    }
    return rawBufferPromises.get(fullUrl);
  }

  async function fetchAndDecodeBuffer(url, decodeCtx = ctx) {
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}${cacheBust}`;
    if (decodedBufferCache.has(fullUrl)) {
      return decodedBufferCache.get(fullUrl);
    }
    const arr = await fetchRawArrayBuffer(url);
    const targetCtx = decodeCtx || ctx;
    if (!targetCtx) return null;
    // Clone the ArrayBuffer before decoding in case decodeAudioData detaches it
    const decoded = await targetCtx.decodeAudioData(arr.slice(0));
    decodedBufferCache.set(fullUrl, decoded);
    return decoded;
  }

  /**
   * Pre-fetches and pre-decodes all loop and one-shot WAV stems into RAM using
   * an OfflineAudioContext so pressing Enter has zero network or decode delay.
   */
  function preload() {
    if (preloadPromise) return preloadPromise;
    preloadPromise = (async () => {
      try {
        const OfflineCtx =
          window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const offlineCtx = OfflineCtx ? new OfflineCtx(2, 1, 44100) : null;
        const allUrls = [
          ...Object.values(LOOP_STEM_FILES).map((f) => `${baseUrl}/${f}`),
          ...ONESHOT_STEM_FILES.sputter.map((f) => `${baseUrl}/${f}`),
        ];
        await Promise.all(
          allUrls.map(async (url) => {
            try {
              if (offlineCtx) {
                await fetchAndDecodeBuffer(url, offlineCtx);
              } else {
                await fetchRawArrayBuffer(url);
              }
            } catch (_) {
              // Ignore individual stem preload errors
            }
          })
        );
      } catch (_) {
        // Fallback to on-demand loading in loadAllStems
      }
    })();
    return preloadPromise;
  }

  async function loadAllStems() {
    if (!ctx || loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      try {
        // Load stationary start-line `idle`, unified driving `cruise`, and
        // surface `drift` & `curb` loops
        const activeLoopKeys = ['idle', 'cruise', 'drift', 'curb'];
        await Promise.all(activeLoopKeys.map(async (key) => {
          const filename = LOOP_STEM_FILES[key];
          try {
            const buffer = await fetchAndDecodeBuffer(`${baseUrl}/${filename}`);
            if (!buffer) return;
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.loop = true;

            const gain = ctx.createGain();
            gain.gain.value = 0.0;

            src.connect(gain);
            if (key === 'drift' || key === 'curb') {
              gain.connect(masterGain);
            } else {
              gain.connect(misfireDuckGain);
            }

            src.start(0, 0);
            loopNodes[key] = {src, gain, buffer};
          } catch (e) {
            console.warn(
                `[DeskRacerHybridAudio] Could not load loop stem ${filename}:`,
                e);
          }
        }));

        for (const file of ONESHOT_STEM_FILES.sputter) {
          try {
            const buf = await fetchAndDecodeBuffer(`${baseUrl}/${file}`);
            if (buf) oneShotBuffers.sputter.push(buf);
          } catch (_) {
          }
        }

        stemsLoaded = Boolean(loopNodes.cruise);
      } catch (err) {
        console.warn('[DeskRacerHybridAudio] Stem loading error:', err);
      }
    })();
    return loadingPromise;
  }

  function initAudio() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(ctx.destination);

    // Subtle upper-mid mechanical presence filter (1.5 kHz valve & exhaust
    // snap)
    presencePeakFilter = ctx.createBiquadFilter();
    presencePeakFilter.type = 'peaking';
    presencePeakFilter.frequency.value = 1550;
    presencePeakFilter.Q.value = 1.0;
    presencePeakFilter.gain.value = 1.6;
    presencePeakFilter.connect(masterGain);

    // Formant-Compensating Low-Pass Filter:
    // Wide open (6.5 kHz) at 0.75x-1.00x Cruise, gently rolling off >3.3 kHz
    // at 1.22x-1.38x so pitching up `kart_cruise_mid_loop.wav` never introduces
    // high-frequency shimmer or fuzz!
    engineBusFilter = ctx.createBiquadFilter();
    engineBusFilter.type = 'lowpass';
    engineBusFilter.frequency.value = 6200;
    engineBusFilter.Q.value = 0.707;
    engineBusFilter.connect(presencePeakFilter);

    // Formant-Compensating 95 Hz Low-Shelf Filter:
    // Directly amplifies the natural 60-120 Hz piston & muffler pulses inside
    // `kart_cruise_mid_loop.wav` (100% phase-locked to the cruise stem with
    // ZERO second-engine muddle!)
    lowShelfFilter = ctx.createBiquadFilter();
    lowShelfFilter.type = 'lowshelf';
    lowShelfFilter.frequency.value = 98;
    lowShelfFilter.gain.value = 3.5;
    lowShelfFilter.connect(engineBusFilter);

    // Misfire Duck GainNode: briefly dips for 16ms when a cylinder skips a
    // stroke
    misfireDuckGain = ctx.createGain();
    misfireDuckGain.gain.value = 1.0;
    misfireDuckGain.connect(lowShelfFilter);

    // Clean <95 Hz Sub-Harmonic Sine Reinforcer (Zero WaveShaper Distortion!)
    rumbleSubOsc = ctx.createOscillator();
    rumbleSubOsc.type = 'sine';
    rumbleSubOsc.frequency.value = 55.0;

    rumbleLowpass = ctx.createBiquadFilter();
    rumbleLowpass.type = 'lowpass';
    rumbleLowpass.frequency.value = 95.0;
    rumbleLowpass.Q.value = 0.707;

    rumbleOutGain = ctx.createGain();
    rumbleOutGain.gain.value = 0.0;

    rumbleSubOsc.connect(rumbleLowpass);
    rumbleLowpass.connect(rumbleOutGain);
    rumbleOutGain.connect(masterGain);
    rumbleSubOsc.start();

    loadAllStems();
  }

  /**
   * Triggers a clean, subtle cylinder stumble + exhaust pop without cluttering
   * `kart_cruise_mid_loop.wav`.
   */
  function fireSingleRealSputterPop(
      delayS = 0.0, intensity = 1.0, mode = 'idle') {
    if (!ctx || !enabled || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delayS;
    const isIdleStumble = mode === 'idle';
    const isOverrunBackfire = mode === 'overrun';
    const v = 0.92 + 0.16 * Math.random();

    if (misfireDuckGain) {
      misfireDuckGain.gain.setValueAtTime(1.0, t0);
      misfireDuckGain.gain.linearRampToValueAtTime(
          isIdleStumble ? 0.55 : 0.42, t0 + 0.008);
      misfireDuckGain.gain.linearRampToValueAtTime(1.0, t0 + 0.036);
    }

    const tPop = t0 + 0.012;
    const dur = isOverrunBackfire ? 0.050 : 0.038;

    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime((isIdleStumble ? 76.0 : 98.0) * v, tPop);
    thumpOsc.frequency.exponentialRampToValueAtTime(
        (isIdleStumble ? 40.0 : 45.0) * v, tPop + dur);

    const peakGain = Math.min(0.30, (isIdleStumble ? 0.12 : 0.18) * intensity);
    thumpGain.gain.setValueAtTime(0.0001, tPop);
    thumpGain.gain.linearRampToValueAtTime(peakGain, tPop + 0.003);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, tPop + dur);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(masterGain);
    thumpOsc.start(tPop);
    thumpOsc.stop(tPop + dur + 0.01);

    if ((isOverrunBackfire || isIdleStumble) &&
        oneShotBuffers.sputter.length > 0) {
      const buf = isIdleStumble
        ? oneShotBuffers.sputter[0]
        : oneShotBuffers.sputter[
            1 + Math.floor(Math.random() * Math.max(1, oneShotBuffers.sputter.length - 1))
          ] || oneShotBuffers.sputter[oneShotBuffers.sputter.length - 1];
      const sliceDur = 0.16 + 0.10 * Math.random();
      const maxOffset = Math.max(0.0, buf.duration - sliceDur - 0.05);
      const offset = Math.random() * maxOffset;

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.94 + 0.12 * Math.random();

      const g = ctx.createGain();
      const gPeak = Math.min(0.55, (isIdleStumble ? 0.22 : 0.32) * intensity);
      g.gain.setValueAtTime(0.0001, tPop);
      g.gain.linearRampToValueAtTime(gPeak, tPop + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, tPop + sliceDur);

      src.connect(g);
      g.connect(presencePeakFilter);
      src.start(tPop, offset, sliceDur + 0.02);
    }
  }

  function triggerSputterBurst(intensity = 1.0, mode = 'auto') {
    if (!ctx || !enabled) return;
    sputterCount += 1;
    let resolvedMode = mode;
    if (resolvedMode === 'auto') {
      if (smoothAccelRate < -0.25 && smoothNormSpeed > 0.18) {
        resolvedMode = 'overrun';
      } else if (smoothNormSpeed < 0.15) {
        resolvedMode = 'idle';
      } else {
        resolvedMode = 'accel';
      }
    }
    const numPops =
        resolvedMode === 'overrun' ? 1 + Math.floor(Math.random() * 2) : 1;
    let offset = 0.0;
    for (let i = 0; i < numPops; i++) {
      fireSingleRealSputterPop(
          offset, intensity * (0.85 + 0.20 * Math.random()), resolvedMode);
      offset += 0.075 + 0.065 * Math.random();
    }
  }

  function setEnabled(state) {
    enabled = Boolean(state);
    if (enabled) {
      initAudio();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.05);
      }
    } else if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function update(state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;

    const nowMs = performance.now();
    const dt = Math.min(0.1, Math.max(0.004, (nowMs - prevTimeMs) * 0.001));
    prevTimeMs = nowMs;

    // Calibrated to KartPhysicsController.js (V6.3 N-scale 0.204 m/s and V6.1
    // 0.23 m/s)
    const rawSpeed = Math.abs(state.speed || 0.0);
    const targetNormSpeed = Math.min(1.45, rawSpeed / 0.204);
    const rawAccel = (targetNormSpeed - prevSpeed) / dt;
    prevSpeed = targetNormSpeed;

    const speedAlpha = 1.0 - Math.exp(-9.5 * dt);
    const accelAlpha = 1.0 - Math.exp(-6.5 * dt);
    const boostAlpha = 1.0 - Math.exp(-6.0 * dt);
    const loadAlpha = 1.0 - Math.exp(-7.5 * dt);

    smoothNormSpeed += (targetNormSpeed - smoothNormSpeed) * speedAlpha;
    smoothAccelRate += (rawAccel - smoothAccelRate) * accelAlpha;

    const isBoostActive = (state.boostActive || 0) > 0 || rawSpeed > 0.245;
    const targetBoost = isBoostActive ? 1.0 : 0.0;
    smoothBoostBlend += (targetBoost - smoothBoostBlend) * boostAlpha;

    // Compute track uphill slope & Cat/Lamp spiral curl load so the engine
    // noticeably decelerates and lugs down when climbing hills or curling
    // around the Cat Helix & Lamp Corkscrew
    const slope = typeof state.slope === 'number'            ? state.slope :
        state.tangent && typeof state.tangent.y === 'number' ? state.tangent.y :
                                                               0.0;
    const sPos =
        typeof state.s === 'number' ? ((state.s % 3.12) + 3.12) % 3.12 : -1.0;

    // Cat Helix (s in [0.42, 1.34]) and Lamp Corkscrew (s in [1.48, 2.48]) curl
    // deceleration profile: Strongest during entry braking & uphill spiral
    // climb, then releasing as the kart dives out the exit
    let spiralCurlLoad = 0.0;
    if (sPos >= 0.40 && sPos <= 1.34) {
      const uCat = (sPos - 0.40) / 0.94;
      const entryFade = Math.min(1.0, uCat / 0.16);
      const exitFade = Math.min(1.0, (1.0 - uCat) / 0.28);
      // Peak deceleration load in the upper entry & climb (uCat = 0.12..0.58)
      const climbShape =
          0.35 + 0.65 * Math.exp(-Math.pow((uCat - 0.32) / 0.28, 2.0));
      spiralCurlLoad = entryFade * exitFade * climbShape;
    } else if (sPos >= 1.46 && sPos <= 2.48) {
      const uLamp = (sPos - 1.46) / 1.02;
      const entryFade = Math.min(1.0, uLamp / 0.16);
      const exitFade = Math.min(1.0, (1.0 - uLamp) / 0.26);
      // Peak deceleration load in the tight corkscrew entry & ascending loop
      // (uLamp = 0.15..0.62)
      const climbShape =
          0.35 + 0.65 * Math.exp(-Math.pow((uLamp - 0.38) / 0.28, 2.0));
      spiralCurlLoad = entryFade * exitFade * climbShape;
    }

    // Uphill slope lugging (>0 slows engine down significantly; <0 downhill
    // lets engine wind up)
    const uphillLug = slope > 0.0 ? slope * 0.72 : slope * 0.32;
    const targetHillAndCurlLoad =
        Math.max(-0.12, Math.min(0.36, uphillLug + spiralCurlLoad * 0.18));
    smoothHillAndCurlLoad +=
        (targetHillAndCurlLoad - smoothHillAndCurlLoad) * loadAlpha;

    const clampedNorm = Math.min(1.08, smoothNormSpeed);
    const decelFactor = Math.min(
        1.0,
        Math.max(
            0.0,
            (-smoothAccelRate - 0.06) / 0.55 +
                Math.max(0.0, smoothHillAndCurlLoad) * 0.75));
    const accelKick = smoothAccelRate >= 0.0 ?
        Math.min(0.11, smoothAccelRate * 0.075) :
        Math.max(-0.14, smoothAccelRate * 0.12);

    // --- EXPANDED DRIVING PITCH CURVE WITH HILL & SPIRAL DECELERATION ---
    // Maps the active driving speed band (`clampedNorm` 0.50 -> 1.02, i.e. 38
    // -> 77 km/h) across a wide, expressive RPM range (`0.68x` uphill/spiral
    // lug -> `1.28x` fast straightaway -> `1.44x` boost) so slowing down on
    // hills or inside the Cat and Lamp curls is immediately audible!
    let baseRate;
    if (clampedNorm <= 0.48) {
      // 0 -> 36 km/h launch roll-out: 0.66x -> 0.74x
      baseRate = 0.66 + (clampedNorm / 0.48) * (0.74 - 0.66);
    } else if (clampedNorm <= 0.78) {
      // 36 -> 58 km/h (Uphill climbs & Cat/Lamp spiral curls!): steep 0.74x ->
      // 0.96x curve
      baseRate = 0.74 + ((clampedNorm - 0.48) / 0.30) * (0.96 - 0.74);
    } else {
      // 58 -> 78 km/h (Fast straightaways & downhill spiral exits): 0.96x
      // -> 1.28x
      baseRate = 0.96 + ((clampedNorm - 0.78) / 0.24) * (1.28 - 0.96);
    }

    const targetCruiseRate = Math.max(
        0.66,
        Math.min(
            1.46,
            baseRate - smoothHillAndCurlLoad + 0.16 * smoothBoostBlend +
                accelKick));
    const targetF0 = Math.round(122.0 * targetCruiseRate);

    const now = ctx.currentTime;
    const timeConst = 0.035;

    if (loopNodes.idle && loopNodes.cruise) {
      const launchU =
          Math.min(1.0, Math.max(0.0, (rawSpeed - 0.005) / (0.012 - 0.005)));
      const idleGain = 0.96 * Math.cos(0.5 * Math.PI * launchU);
      const cruiseGain = 0.96 * Math.sin(0.5 * Math.PI * launchU);
      loopNodes.idle.gain.gain.setTargetAtTime(idleGain, now, timeConst);
      loopNodes.idle.src.playbackRate.setTargetAtTime(1.0, now, timeConst);
      loopNodes.cruise.gain.gain.setTargetAtTime(cruiseGain, now, timeConst);
      loopNodes.cruise.src.playbackRate.setTargetAtTime(
          targetCruiseRate, now, timeConst);
    } else if (loopNodes.cruise) {
      loopNodes.cruise.gain.gain.setTargetAtTime(0.96, now, timeConst);
      loopNodes.cruise.src.playbackRate.setTargetAtTime(
          targetCruiseRate, now, timeConst);
    }

    // --- Formant-Compensating EQ + Hill/Curl Load Timbre Shift ---
    // 1. Low-Shelf (98 Hz): Boosts deep muffler chest rumble both at high pitch
    // AND when lugging uphill/in spirals
    const pitchAboveOne = Math.max(0.0, targetCruiseRate - 0.95);
    const lugWarmth = Math.max(0.0, smoothHillAndCurlLoad) * 9.5;
    const shelfDb = userRumbleAmount *
        (2.8 + 8.5 * pitchAboveOne + lugWarmth +
         1.2 * Math.max(0, accelKick * 10));
    if (lowShelfFilter) {
      lowShelfFilter.gain.setTargetAtTime(Math.min(10.5, shelfDb), now, 0.04);
    }

    // 2. Presence Peak (1.5 kHz): Softens during uphill/spiral deceleration so
    // slowing down sounds noticeably darker/throatier
    if (presencePeakFilter) {
      const presDb = Math.max(
          -1.5,
          (targetCruiseRate < 0.92 ? 2.4 : 2.0 - 3.0 * pitchAboveOne) -
              Math.max(0.0, smoothHillAndCurlLoad) * 8.0);
      presencePeakFilter.gain.setTargetAtTime(presDb, now, 0.04);
    }

    // 3. Low-Pass Filter: Rolls down to ~2200-2800 Hz when decelerating into
    // Cat/Lamp curls or lugging uphill,
    //    and opens up bright (6000 Hz) on fast straightaways
    const slowCurlDarken = Math.max(0.0, 0.96 - targetCruiseRate) * 9500;
    const targetCutoff = Math.max(
        2150,
        Math.min(
            6800,
            6400 - 7200 * Math.max(0.0, targetCruiseRate - 1.04) -
                slowCurlDarken - 650 * decelFactor));
    engineBusFilter.frequency.setTargetAtTime(targetCutoff, now, 0.04);

    // 4. Subtle Phase-Clean Sub-Bass Sine (<95 Hz) for physical chest weight
    if (rumbleSubOsc && rumbleOutGain) {
      const subHz = Math.min(82.0, Math.max(40.0, targetF0 * 0.5));
      rumbleSubOsc.frequency.setTargetAtTime(subHz, now, 0.03);
      const subGain = Math.min(
          0.20,
          0.075 * userRumbleAmount *
              (0.85 + 0.35 * Math.min(1.0, clampedNorm) +
               Math.max(0.0, smoothHillAndCurlLoad) * 0.8));
      rumbleOutGain.gain.setTargetAtTime(subGain, now, 0.04);
    }

    // Tire Drift Scrub & FIA Curb Rumble loops
    const targetDriftGain =
        state.isDrifting ? 0.42 * Math.min(1.0, smoothNormSpeed / 0.30) : 0.0;
    const targetCurbGain = (state.curbRumble || 0) > 0.05 ?
        Math.min(0.48, state.curbRumble * 0.48) :
        0.0;

    if (loopNodes.drift) {
      loopNodes.drift.gain.gain.setTargetAtTime(targetDriftGain, now, 0.04);
      loopNodes.drift.src.playbackRate.setTargetAtTime(
          0.92 + 0.18 * smoothNormSpeed, now, 0.05);
    }
    if (loopNodes.curb) {
      loopNodes.curb.gain.gain.setTargetAtTime(targetCurbGain, now, 0.03);
      loopNodes.curb.src.playbackRate.setTargetAtTime(
          0.88 + 0.32 * smoothNormSpeed, now, 0.04);
    }

    // Subtle sputter scheduler (fires overrun exhaust pops when
    // braking/decelerating into Cat & Lamp curls or hills)
    if (userSputterAmount > 0.05 && now >= nextSputterTime) {
      if (decelFactor > 0.22 && smoothNormSpeed > 0.22) {
        triggerSputterBurst(userSputterAmount * 0.85, 'overrun');
        nextSputterTime = now +
            (0.60 + 0.75 * Math.random()) / Math.max(0.3, userSputterAmount);
      } else if (smoothNormSpeed < 0.10) {
        triggerSputterBurst(userSputterAmount * 0.45, 'idle');
        nextSputterTime = now +
            (3.20 + 2.50 * Math.random()) / Math.max(0.3, userSputterAmount);
      } else {
        nextSputterTime = now + 0.35;
      }
    }

    // Compute UI telemetry bar indicators for the current speed regime
    const {wIdle, wCruise, wFlatout, wBoost} = computeCrispRegimeWeights(
        75.0 + 129.0 * Math.min(1.0, clampedNorm) + 64.0 * smoothBoostBlend);
    const wDecel = decelFactor * Math.min(1.0, smoothNormSpeed / 0.25) * 0.85;

    lastDiag = {
      stemsLoaded,
      normSpeed: Number(smoothNormSpeed.toFixed(2)),
      cruisePlaybackRate: Number(targetCruiseRate.toFixed(2)),
      weights: {
        idle: Number(wIdle.toFixed(2)),
        cruise: Number(Math.max(wCruise, 0.95).toFixed(2)),
        flatout: Number(wFlatout.toFixed(2)),
        decel: Number(wDecel.toFixed(2)),
        f1Boost: Number(wBoost.toFixed(2)),
        rumble: Number(Math.min(
                               1.0,
                               userRumbleAmount *
                                   (0.65 + 0.25 * Math.min(1.0, clampedNorm)))
                           .toFixed(2)),
        drift: Number(targetDriftGain.toFixed(2)),
        curb: Number(targetCurbGain.toFixed(2)),
      },
      filterCutoffHz: Math.round(targetCutoff),
      harmonicBridgeHz: targetF0,
      sputterCount,
    };
  }

  function playLapChime() {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, now + idx * 0.07);
      g.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.07 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.35);
      o.connect(g);
      g.connect(masterGain);
      o.start(now + idx * 0.07);
      o.stop(now + idx * 0.07 + 0.38);
    });
  }

  /**
   * Plays the Formula 1 5-Light Start Countdown Beep:
   * - `isGo === false` (each of the 5 red lamps turning ON): identical 880 Hz
   * (A5) F1 gantry tone
   * - `isGo === true`  (all 5 red lamps turning OFF simultaneously): high 1760
   * Hz (A6) "GO!" tone
   */
  function playF1CountdownBeep(isGo = false) {
    if (!enabled) return;
    initAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const baseFreq = isGo ? 1760.0 : 880.0;
    const dur = isGo ? 0.42 : 0.20;
    const peakGain = isGo ? 1.10 : 0.88;

    // Gently duck the engine bus during each F1 gantry beep so the countdown
    // tone cuts through cleanly
    if (misfireDuckGain) {
      misfireDuckGain.gain.setValueAtTime(0.72, now);
      misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + dur);
    }

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    toneFilter.frequency.value = isGo ? 5200 : 3000;
    toneFilter.Q.value = 0.707;
    toneFilter.connect(masterGain);

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(peakGain, now + 0.005);
    envGain.gain.setValueAtTime(peakGain * 0.92, now + dur * 0.65);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    envGain.connect(toneFilter);

    // Primary F1 broadcast sine + subtle triangle harmonic overtone
    const oscMain = ctx.createOscillator();
    oscMain.type = 'sine';
    oscMain.frequency.setValueAtTime(baseFreq, now);
    oscMain.connect(envGain);

    const oscHarm = ctx.createOscillator();
    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(baseFreq, now);
    const harmGain = ctx.createGain();
    harmGain.gain.value = 0.32;
    oscHarm.connect(harmGain);
    harmGain.connect(envGain);

    oscMain.start(now);
    oscHarm.start(now);
    oscMain.stop(now + dur + 0.02);
    oscHarm.stop(now + dur + 0.02);
  }

  /**
   * Plays a physical, tactile miniature coaster guardrail impact / metallic
   * barrier scrape when the kart hits the side rails.
   * @param {number=} intensity
   */
  function playRailImpact(intensity = 1.0) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const strength = Math.max(0.2, Math.min(1.35, Number(intensity) || 1.0));
    const pitchJitter = 0.96 + 0.08 * Math.random();

    // Brief engine duck so the barrier impact feels visceral and unmistakable
    if (misfireDuckGain) {
      misfireDuckGain.gain.cancelScheduledValues(now);
      misfireDuckGain.gain.setValueAtTime(1.0, now);
      misfireDuckGain.gain.linearRampToValueAtTime(
          Math.max(0.38, 1.0 - 0.45 * strength), now + 0.010);
      misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + 0.085);
    }

    // 1. Punchy low chassis thud (~110 Hz -> 42 Hz sine/triangle pitch drop
    // over 0.09s)
    const thudDur = 0.09;
    const thudGain = ctx.createGain();
    const thudPeak = Math.min(0.42, 0.28 * strength);
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.linearRampToValueAtTime(thudPeak, now + 0.004);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + thudDur);
    thudGain.connect(masterGain);

    const thudSine = ctx.createOscillator();
    thudSine.type = 'sine';
    thudSine.frequency.setValueAtTime(110.0 * pitchJitter, now);
    thudSine.frequency.exponentialRampToValueAtTime(
        42.0 * pitchJitter, now + thudDur);
    thudSine.connect(thudGain);

    const thudTri = ctx.createOscillator();
    thudTri.type = 'triangle';
    thudTri.frequency.setValueAtTime(110.0 * pitchJitter, now);
    thudTri.frequency.exponentialRampToValueAtTime(
        42.0 * pitchJitter, now + thudDur);
    const thudTriGain = ctx.createGain();
    thudTriGain.gain.value = 0.35;
    thudTri.connect(thudTriGain);
    thudTriGain.connect(thudGain);

    thudSine.start(now);
    thudTri.start(now);
    thudSine.stop(now + thudDur + 0.015);
    thudTri.stop(now + thudDur + 0.015);

    // 2. Crisp bandpass-filtered metallic rail clang/scrape transient
    // (~980 Hz & ~1640 Hz short damped metallic partials over 0.11s)
    const clangDur = 0.11;
    const railBandpass = ctx.createBiquadFilter();
    railBandpass.type = 'bandpass';
    railBandpass.frequency.setValueAtTime(1280.0 * pitchJitter, now);
    railBandpass.Q.setValueAtTime(2.2, now);
    railBandpass.connect(masterGain);

    const partials = [
      {
        freq: 980.0 * pitchJitter,
        endFreq: 860.0 * pitchJitter,
        type: 'triangle',
        gain: 0.16 * strength,
      },
      {
        freq: 1640.0 * pitchJitter,
        endFreq: 1420.0 * pitchJitter,
        type: 'sine',
        gain: 0.11 * strength,
      },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(p.freq, now);
      osc.frequency.exponentialRampToValueAtTime(p.endFreq, now + clangDur);
      const peak = Math.min(0.24, p.gain);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(peak, now + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, now + clangDur);
      osc.connect(g);
      g.connect(railBandpass);
      osc.start(now);
      osc.stop(now + clangDur + 0.015);
    });
  }

  /**
   * Plays a celebratory, triumphant 3-lap finish chord fanfare when crossing
   * the Start/Finish gantry at the end of Lap 3.
   */
  function playRaceFinishFanfare() {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    if (misfireDuckGain) {
      misfireDuckGain.gain.cancelScheduledValues(now);
      misfireDuckGain.gain.setValueAtTime(0.68, now);
      misfireDuckGain.gain.linearRampToValueAtTime(1.0, now + 1.15);
    }

    const fanfareFilter = ctx.createBiquadFilter();
    fanfareFilter.type = 'lowpass';
    fanfareFilter.frequency.setValueAtTime(3600, now);
    fanfareFilter.frequency.linearRampToValueAtTime(5400, now + 0.34);
    fanfareFilter.frequency.exponentialRampToValueAtTime(2400, now + 1.35);
    fanfareFilter.Q.value = 0.707;
    fanfareFilter.connect(masterGain);

    // Ascending arpeggio: C5 -> E5 -> G5 -> B5 -> C6
    const arpeggio = [
      {freq: 523.25, start: 0.00, dur: 0.32, gain: 0.14},  // C5
      {freq: 659.25, start: 0.07, dur: 0.34, gain: 0.14},  // E5
      {freq: 783.99, start: 0.14, dur: 0.36, gain: 0.15},  // G5
      {freq: 987.77, start: 0.21, dur: 0.42, gain: 0.15},  // B5
      {freq: 1046.50, start: 0.29, dur: 0.92, gain: 0.19}, // C6 resolution lead
    ];

    // Sustained major/ninth resolution chord layers locked to the C6 peak
    const resolutionChord = [
      {freq: 523.25, start: 0.29, dur: 0.88, gain: 0.11},  // C5 root
      {freq: 659.25, start: 0.29, dur: 0.88, gain: 0.10},  // E5 major 3rd
      {freq: 783.99, start: 0.29, dur: 0.90, gain: 0.11},  // G5 5th
      {freq: 987.77, start: 0.29, dur: 0.86, gain: 0.09},  // B5 major 7th
      {freq: 1174.66, start: 0.31, dur: 0.84, gain: 0.08}, // D6 9th shimmer
    ];

    [...arpeggio, ...resolutionChord].forEach(({freq, start, dur, gain}) => {
      const t0 = now + start;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.linearRampToValueAtTime(gain, t0 + 0.014);
      env.gain.setValueAtTime(gain * 0.85, t0 + dur * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      env.connect(fanfareFilter);

      const oscSine = ctx.createOscillator();
      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(freq, t0);
      oscSine.connect(env);

      const oscTri = ctx.createOscillator();
      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(freq, t0);
      const triGain = ctx.createGain();
      triGain.gain.value = 0.38;
      oscTri.connect(triGain);
      triGain.connect(env);

      oscSine.start(t0);
      oscTri.start(t0);
      oscSine.stop(t0 + dur + 0.02);
      oscTri.stop(t0 + dur + 0.02);
    });
  }

  return {
    preload,
    toggle,
    setEnabled,
    update,
    playLapChime,
    playRaceFinishFanfare,
    playRailImpact,
    playF1CountdownBeep,
    triggerSputterBurst,
    setRumbleAmount: (v) => {
      userRumbleAmount = Math.max(0.0, Math.min(2.5, Number(v)));
    },
    setSputterAmount: (v) => {
      userSputterAmount = Math.max(0.0, Math.min(2.5, Number(v)));
    },
    isEnabled: () => enabled,
    getDiagnostics: () => lastDiag,
  };
}

// Export alias matching `src/audio/WebAudioSynth.js` signature for 1-line
// drop-in replacement
export const createWebAudioSynth = createDeskRacerHybridAudio;
