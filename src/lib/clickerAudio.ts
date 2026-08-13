/**
 * Web Audio API synthesizer for realistic mechanical keyboard switch click sounds
 * Generates distinct acoustic profiles for Blue (clicky), Red (linear thock), Brown (tactile bump)
 */

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const playSwitchSound = (switchType: 'red' | 'blue' | 'brown' | 'black' | 'yellow' = 'blue') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Transient Click / Impact Noise Burst
    const bufferSize = ctx.sampleRate * 0.04; // 40ms burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Filter noise to match switch timbre
    const filter = ctx.createBiquadFilter();
    if (switchType === 'blue') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.Q.setValueAtTime(4.5, now);
    } else if (switchType === 'brown') {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
    } else {
      // Red / Yellow / Black
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);
    }

    const noiseGain = ctx.createGain();
    const peakGain = switchType === 'blue' ? 0.35 : switchType === 'brown' ? 0.22 : 0.18;
    noiseGain.gain.setValueAtTime(peakGain, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (switchType === 'blue' ? 0.035 : 0.05));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2. Housing Resonance / Thock Tone (Oscillator)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    if (switchType === 'blue') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    } else if (switchType === 'brown') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);
      oscGain.gain.setValueAtTime(0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    } else {
      // Deep Linear Thock
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

  } catch {
    // Graceful fallback if audio context blocked by browser autoplay policy
  }
};
