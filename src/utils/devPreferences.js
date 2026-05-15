const SHOW_BOUNTY_STORAGE_KEY = 'thinkAlikeShowBounty';

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
