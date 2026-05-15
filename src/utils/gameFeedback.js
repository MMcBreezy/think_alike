import { readSoundVolumePercent, writeSoundVolumePercent } from './devPreferences.js';
import { GAME_MODES } from './gameRules.js';

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let audioContext = null;
let masterGain = null;
let soundVolume = readSoundVolumePercent() / 100;

function clampVolume(value) {
  return Math.min(1, Math.max(0, value));
}

function isSoundAudible() {
  return soundVolume > 0.001;
}

function ensureMasterGain(ctx) {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = soundVolume;
    masterGain.connect(ctx.destination);
  }
}

async function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioContext) {
    audioContext = new AudioCtx();
  }

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      return null;
    }
  }

  ensureMasterGain(audioContext);
  return audioContext;
}

function getMasterOutput(ctx) {
  ensureMasterGain(ctx);
  return masterGain;
}

function connectTone(
  ctx,
  { startTime, duration, frequency, type = 'sine', peakGain = 0.2 },
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(getMasterOutput(ctx));
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function getSoundVolumePercent() {
  return Math.round(soundVolume * 100);
}

export function setSoundVolumePercent(percent) {
  soundVolume = clampVolume(percent / 100);
  writeSoundVolumePercent(Math.round(soundVolume * 100));
  if (masterGain && audioContext) {
    masterGain.gain.setValueAtTime(soundVolume, audioContext.currentTime);
  }
}

export function vibrate(pattern) {
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

const DIGIT_KEY_FREQUENCY = 659.25;

export async function playDigitSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const frequency = DIGIT_KEY_FREQUENCY;
  const now = ctx.currentTime;

  connectTone(ctx, {
    startTime: now,
    duration: 0.1,
    frequency,
    type: 'sine',
    peakGain: 0.11,
  });
  connectTone(ctx, {
    startTime: now + 0.004,
    duration: 0.07,
    frequency: frequency * 2,
    type: 'triangle',
    peakGain: 0.035,
  });
}

export async function playBackspaceSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  connectTone(ctx, {
    startTime: now,
    duration: 0.07,
    frequency: 466.16,
    type: 'triangle',
    peakGain: 0.09,
  });
  connectTone(ctx, {
    startTime: now + 0.045,
    duration: 0.08,
    frequency: 349.23,
    type: 'sine',
    peakGain: 0.08,
  });
}

export async function playClearSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  connectTone(ctx, {
    startTime: now,
    duration: 0.1,
    frequency: 392,
    type: 'triangle',
    peakGain: 0.1,
  });
  connectTone(ctx, {
    startTime: now + 0.06,
    duration: 0.12,
    frequency: 293.66,
    type: 'sine',
    peakGain: 0.09,
  });
  connectTone(ctx, {
    startTime: now + 0.11,
    duration: 0.14,
    frequency: 220,
    type: 'triangle',
    peakGain: 0.06,
  });
}

export async function playSubmitSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  connectTone(ctx, {
    startTime: now,
    duration: 0.09,
    frequency: 520,
    type: 'sine',
    peakGain: 0.18,
  });
  connectTone(ctx, {
    startTime: now + 0.08,
    duration: 0.14,
    frequency: 784,
    type: 'sine',
    peakGain: 0.16,
  });
}

function playChord(ctx, { startTime, frequencies, duration, peakGain, type = 'triangle' }) {
  const perVoice = peakGain / frequencies.length;
  for (const frequency of frequencies) {
    connectTone(ctx, {
      startTime,
      duration,
      frequency,
      type,
      peakGain: perVoice,
    });
  }
}

export async function playAirhornSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  playChord(ctx, {
    startTime: now,
    duration: 0.85,
    frequencies: [261.63, 329.63, 392.0, 523.25],
    peakGain: 0.16,
    type: 'triangle',
  });

  const fanfare = [
    { frequency: 523.25, delay: 0.06, duration: 0.38, peakGain: 0.12 },
    { frequency: 659.25, delay: 0.14, duration: 0.38, peakGain: 0.11 },
    { frequency: 783.99, delay: 0.22, duration: 0.42, peakGain: 0.12 },
    { frequency: 987.77, delay: 0.32, duration: 0.45, peakGain: 0.1 },
    { frequency: 1174.66, delay: 0.44, duration: 0.5, peakGain: 0.1 },
    { frequency: 1567.98, delay: 0.58, duration: 0.62, peakGain: 0.09 },
  ];

  for (const note of fanfare) {
    connectTone(ctx, {
      startTime: now + note.delay,
      duration: note.duration,
      frequency: note.frequency,
      type: 'sine',
      peakGain: note.peakGain,
    });
  }

  playChord(ctx, {
    startTime: now + 0.72,
    duration: 0.55,
    frequencies: [1046.5, 1318.51, 1567.98],
    peakGain: 0.08,
    type: 'sine',
  });
}

export function isNumberMatchFeedback(feedback, gameMode) {
  if (!feedback) return false;
  if (gameMode === GAME_MODES.COMPETITIVE) {
    return (
      feedback === 'perfect' ||
      feedback === 'match' ||
      feedback === 'comeback-lightning-hit'
    );
  }
  return feedback === 'perfect-sync' || feedback === 'jackpot-sync';
}

/** Competitive reveal sounds (normal match rounds + lightning + comeback lightning). */
export function feedbackCompetitiveReveal(feedback) {
  if (!feedback) return;
  if (
    feedback === 'no-match' ||
    feedback === 'lightning-miss' ||
    feedback === 'comeback-lightning-miss'
  ) {
    return;
  }
  if (
    feedback === 'perfect' ||
    feedback === 'match' ||
    feedback === 'lightning-hit' ||
    feedback === 'comeback-lightning-hit'
  ) {
    feedbackNumberMatch();
    return;
  }
  if (feedback === 'lightning-close' || feedback === 'comeback-lightning-close') {
    vibrate([8, 22, 12]);
    void playLightningCloseRevealSound();
  }
}

/** Bounty tone waits briefly after any celebrate / close-call reveal sound in competitive. */
export function competitiveRevealDelaysBounty(feedback) {
  if (!feedback) return false;
  return (
    feedback === 'perfect' ||
    feedback === 'match' ||
    feedback === 'lightning-hit' ||
    feedback === 'lightning-close' ||
    feedback === 'comeback-lightning-hit' ||
    feedback === 'comeback-lightning-close'
  );
}

export async function playLightningCloseRevealSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  connectTone(ctx, {
    startTime: now,
    duration: 0.22,
    frequency: 587.33,
    type: 'sine',
    peakGain: 0.09,
  });
  connectTone(ctx, {
    startTime: now + 0.12,
    duration: 0.28,
    frequency: 783.99,
    type: 'triangle',
    peakGain: 0.085,
  });
}

export async function playNumberMatchSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { frequency: 523.25, delay: 0, duration: 0.42, peakGain: 0.11 },
    { frequency: 659.25, delay: 0.08, duration: 0.42, peakGain: 0.1 },
    { frequency: 783.99, delay: 0.16, duration: 0.5, peakGain: 0.12 },
    { frequency: 1046.5, delay: 0.28, duration: 0.55, peakGain: 0.09 },
  ];

  for (const note of notes) {
    connectTone(ctx, {
      startTime: now + note.delay,
      duration: note.duration,
      frequency: note.frequency,
      type: 'sine',
      peakGain: note.peakGain,
    });
  }
}

export function feedbackNumberMatch() {
  vibrate([12, 45, 18]);
  void playNumberMatchSound();
}

export async function playBountyClaimSound() {
  if (!isSoundAudible()) return;
  const ctx = await getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  playChord(ctx, {
    startTime: now,
    duration: 0.32,
    frequencies: [659.25, 830.61],
    peakGain: 0.1,
    type: 'triangle',
  });

  const bells = [
    { frequency: 987.77, delay: 0.04, duration: 0.28, peakGain: 0.13, type: 'triangle' },
    { frequency: 1174.66, delay: 0.04, duration: 0.3, peakGain: 0.09, type: 'sine' },
    { frequency: 1318.51, delay: 0.16, duration: 0.22, peakGain: 0.11, type: 'triangle' },
    { frequency: 987.77, delay: 0.26, duration: 0.2, peakGain: 0.1, type: 'triangle' },
    { frequency: 783.99, delay: 0.36, duration: 0.24, peakGain: 0.09, type: 'sine' },
    { frequency: 1567.98, delay: 0.48, duration: 0.45, peakGain: 0.07, type: 'sine' },
  ];

  for (const bell of bells) {
    connectTone(ctx, {
      startTime: now + bell.delay,
      duration: bell.duration,
      frequency: bell.frequency,
      type: bell.type,
      peakGain: bell.peakGain,
    });
  }
}

export function feedbackBountyClaim() {
  vibrate([10, 28, 12, 32, 16]);
  void playBountyClaimSound();
}

export function feedbackKeyTap() {
  vibrate(5);
  void playDigitSound();
}

export function feedbackBackspace() {
  vibrate(4);
  void playBackspaceSound();
}

export function feedbackClear() {
  vibrate([5, 18, 5]);
  void playClearSound();
}

export function feedbackSubmit() {
  vibrate([10, 35, 14]);
  void playSubmitSound();
}

export function feedbackAirhorn() {
  vibrate([18, 55, 22, 65, 35]);
  void playAirhornSound();
}

export async function primeAudio() {
  await getAudioContext();
}

export async function previewKeyTapSound() {
  await primeAudio();
  await playDigitSound();
}
