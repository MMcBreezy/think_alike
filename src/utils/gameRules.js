export const GAME_MODES = {
  COMPETITIVE: 'competitive',
  COOP: 'coop',
};

export const CPU_PLAYER_NAME = 'CPU';

export function isCoopStyleMode(gameMode) {
  return gameMode === GAME_MODES.COOP;
}

export const WIN_SCORE = 20;
export const MAX_ROUNDS = 10;

export const COMPETITIVE_MIN_PLAYERS = 3;
export const COMPETITIVE_MAX_PLAYERS = 6;
export const COOP_PLAYER_COUNT = 2;

export const COMPETITIVE_CHAOS_ROUND_EVERY = 4;
export const COOP_CHAOS_ROUND_EVERY = 3;
export const LIGHTNING_ROUND_EVERY = 6;
export const MAX_PICK_CHAOS = 20;
export const MAX_PICK_COMPETITIVE_NORMAL = 50;
export const MAX_PICK_COOP_NORMAL = 100;
export const MAX_PICK_LIGHTNING = 10;
export const CHAOS_SCORE_MULTIPLIER = 2;
export const LIGHTNING_EXACT_POINTS = 5;
export const LIGHTNING_CLOSE_RANGE = 3;
export const LIGHTNING_CLOSE_POINTS = 2;

export const BOUNTY_POINTS = 3;
export const BOUNTY_MAX_PICK = MAX_PICK_COMPETITIVE_NORMAL;
export const BOUNTY_MAX_PICK_COOP = MAX_PICK_COOP_NORMAL;

export function bountyMaxPickForMode(gameMode = GAME_MODES.COMPETITIVE) {
  return isCoopStyleMode(gameMode) ? BOUNTY_MAX_PICK_COOP : BOUNTY_MAX_PICK;
}

export const COOP_CLOSE_RANGE = 5;
export const COOP_NEAR_RANGE = 1;
export const COOP_EXACT_POINTS = 5;
export const COOP_NEAR_POINTS = 2;
export const COOP_CLOSE_POINTS = 1;
export const COOP_FINAL_SYNC_MAX_PICK = 10;
export const COOP_FINAL_SYNC_NEAR_RANGE = 1;
export const COOP_FINAL_SYNC_CLOSE_RANGE = 3;
export const COOP_FINAL_SYNC_NEAR_POINTS = 2;
export const COOP_FINAL_SYNC_CLOSE_POINTS = 1;

export function isLightningRound(round) {
  return round > 0 && round % LIGHTNING_ROUND_EVERY === 0;
}

export function isChaosRound(round, gameMode = GAME_MODES.COMPETITIVE) {
  if (round <= 0) return false;
  if (isLightningRound(round, gameMode)) return false;
  if (gameMode === GAME_MODES.COMPETITIVE) {
    return round % COMPETITIVE_CHAOS_ROUND_EVERY === 0;
  }
  return round % COOP_CHAOS_ROUND_EVERY === 0;
}

export function maxPickForRound(round, gameMode = GAME_MODES.COMPETITIVE) {
  if (isLightningRound(round, gameMode)) return MAX_PICK_LIGHTNING;
  if (isChaosRound(round, gameMode)) return MAX_PICK_CHAOS;
  return isCoopStyleMode(gameMode)
    ? MAX_PICK_COOP_NORMAL
    : MAX_PICK_COMPETITIVE_NORMAL;
}

export function isCoopFinalSyncJackpotRound(
  round,
  gameMode = GAME_MODES.COMPETITIVE,
  teamScore = 0,
  winScore = WIN_SCORE
) {
  if (!isCoopStyleMode(gameMode) || round !== MAX_ROUNDS) return false;

  const remainingPoints = Math.max(0, winScore - teamScore);
  const standardMaxPoints = isChaosRound(round, gameMode)
    ? COOP_EXACT_POINTS * CHAOS_SCORE_MULTIPLIER
    : COOP_EXACT_POINTS;

  return remainingPoints > standardMaxPoints;
}
