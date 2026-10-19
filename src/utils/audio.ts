/**
 * Synthesizes realistic tactile paper flip sounds and pencil strokes using Web Audio API.
 * No external sound files required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Simulates the sound of a paper page lifting and flipping over from front to back.
 */
export function playPaperFlipSound(direction: 'forward' | 'backward' = 'forward', pitchScale = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.22;

    // Create noise buffer for paper friction/rustle
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter to shape into paper texture
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = direction === 'forward' ? 1400 * pitchScale : 1100 * pitchScale;
    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + duration);
    filter.Q.setValueAtTime(1.8, now);

    // Gain envelope: quick attack, textured rustle, gentle thud drop
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    // Subtle low thud for page resting
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.setValueAtTime(0.0001, now + 0.07);
    oscGain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Subtle click when peg pin aligns or clicks
 */
export function playPegSnapSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch {
    // ignore
  }
}

/**
 * Clean acoustic shutter / cut click when animatic transitions between frames
 */
export function playFrameCutSound(volume = 0.08) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // ignore
  }
}

