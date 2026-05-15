const SHOW_BOUNTY_STORAGE_KEY = 'thinkAlikeShowBounty';
const SOUND_VOLUME_STORAGE_KEY = 'thinkAlikeSoundVolume';
const DEFAULT_SOUND_VOLUME_PERCENT = 100;

export function readShowBountyForTesting() {
  try {
    return localStorage.getItem(SHOW_BOUNTY_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeShowBountyForTesting(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(SHOW_BOUNTY_STORAGE_KEY, '1');
    } else {
      localStorage.removeItem(SHOW_BOUNTY_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function readSoundVolumePercent() {
  try {
    const raw = localStorage.getItem(SOUND_VOLUME_STORAGE_KEY);
    if (raw == null) return DEFAULT_SOUND_VOLUME_PERCENT;
    const value = Number(raw);
    if (!Number.isFinite(value)) return DEFAULT_SOUND_VOLUME_PERCENT;
    return Math.min(100, Math.max(0, Math.round(value)));
  } catch {
    return DEFAULT_SOUND_VOLUME_PERCENT;
  }
}

export function writeSoundVolumePercent(percent) {
  try {
    const clamped = Math.min(100, Math.max(0, Math.round(percent)));
    localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, String(clamped));
  } catch {
    // ignore quota / private mode
  }
}
