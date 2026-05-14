import {
  CHAOS_SCORE_MULTIPLIER,
  COOP_CLOSE_POINTS,
  COOP_CLOSE_RANGE,
  COOP_EXACT_POINTS,
  COOP_NEAR_POINTS,
  COOP_NEAR_RANGE,
  GAME_MODES,
  LIGHTNING_CLOSE_POINTS,
  LIGHTNING_CLOSE_RANGE,
  LIGHTNING_EXACT_POINTS,
} from './gameRules.js';

export function calculateMatches(players) {
  const byGuess = new Map();

  for (const player of players) {
    if (!Number.isInteger(player.currentGuess)) continue;
    if (!byGuess.has(player.currentGuess)) byGuess.set(player.currentGuess, []);
    byGuess.get(player.currentGuess).push(player);
  }

  return [...byGuess.entries()]
    .filter(([, matchedPlayers]) => matchedPlayers.length > 1)
    .map(([guess, matchedPlayers]) => ({
      guess,
      size: matchedPlayers.length,
      playerIds: matchedPlayers.map((player) => player.id),
    }))
    .sort((a, b) => a.guess - b.guess);
}

function scoreCompetitiveMatch(size, chaosRound = false) {
  return chaosRound ? size * CHAOS_SCORE_MULTIPLIER : size;
}

export function calculateLightningScore(players, lightningTarget) {
  const roundDeltas = Object.fromEntries(players.map((player) => [player.id, 0]));

  for (const player of players) {
    const distance = Math.abs(player.currentGuess - lightningTarget);
    if (distance === 0) {
      roundDeltas[player.id] = LIGHTNING_EXACT_POINTS;
      continue;
    }
    if (distance <= LIGHTNING_CLOSE_RANGE) {
      roundDeltas[player.id] = LIGHTNING_CLOSE_POINTS;
    }
  }

  const updatedPlayers = players.map((player) => ({
    ...player,
    score: player.score + (roundDeltas[player.id] ?? 0),
  }));

  const exactHits = players.filter((player) => player.currentGuess === lightningTarget).length;
  const closeHits = players.filter(
    (player) =>
      player.currentGuess !== lightningTarget &&
      Math.abs(player.currentGuess - lightningTarget) <= LIGHTNING_CLOSE_RANGE
  ).length;

  let feedback = 'lightning-miss';
  if (exactHits > 0) feedback = 'lightning-hit';
  else if (closeHits > 0) feedback = 'lightning-close';

  return {
    mode: GAME_MODES.COMPETITIVE,
    players: updatedPlayers,
    roundDeltas,
    feedback,
    lightningTarget,
  };
}

export function calculateCompetitiveScore(players, options = {}) {
  const { chaosRound = false, lightningRound = false, lightningTarget = null } = options;

  if (lightningRound && Number.isInteger(lightningTarget)) {
    return calculateLightningScore(players, lightningTarget);
  }

  const matches = calculateMatches(players);
  const roundDeltas = Object.fromEntries(players.map((player) => [player.id, 0]));

  for (const match of matches) {
    const points = scoreCompetitiveMatch(match.size, chaosRound);
    for (const playerId of match.playerIds) {
      roundDeltas[playerId] = points;
    }
  }

  const updatedPlayers = players.map((player) => ({
    ...player,
    score: player.score + (roundDeltas[player.id] ?? 0),
  }));

  let feedback = null;
  if (matches.length === 0) feedback = 'no-match';
  if (matches.length === 1 && matches[0].size === players.length && players.length >= 2) {
    feedback = 'perfect';
  }

  return {
    mode: GAME_MODES.COMPETITIVE,
    players: updatedPlayers,
    roundDeltas,
    feedback,
    matches,
  };
}

export function calculateCoopScore(players, options = {}) {
  const { chaosRound = false } = options;
  const applyChaosPoints = (basePoints) =>
    chaosRound ? basePoints * CHAOS_SCORE_MULTIPLIER : basePoints;

  if (players.length !== 2) {
    return {
      mode: GAME_MODES.COOP,
      teamPoints: 0,
      feedback: 'no-sync',
      distance: null,
    };
  }

  const [firstPlayer, secondPlayer] = players;
  const firstGuess = firstPlayer.currentGuess;
  const secondGuess = secondPlayer.currentGuess;
  const distance = Math.abs(firstGuess - secondGuess);

  if (distance === 0) {
    return {
      mode: GAME_MODES.COOP,
      teamPoints: applyChaosPoints(COOP_EXACT_POINTS),
      feedback: 'perfect-sync',
      distance,
    };
  }

  if (distance <= COOP_NEAR_RANGE) {
    return {
      mode: GAME_MODES.COOP,
      teamPoints: applyChaosPoints(COOP_NEAR_POINTS),
      feedback: 'close-sync',
      distance,
    };
  }

  if (distance <= COOP_CLOSE_RANGE) {
    return {
      mode: GAME_MODES.COOP,
      teamPoints: applyChaosPoints(COOP_CLOSE_POINTS),
      feedback: 'close-sync',
      distance,
    };
  }

  return {
    mode: GAME_MODES.COOP,
    teamPoints: 0,
    feedback: 'no-sync',
    distance,
  };
}

export function calculateRoundResults(players, gameMode, options = {}) {
  if (gameMode === GAME_MODES.COOP) {
    return calculateCoopScore(players, options);
  }

  return calculateCompetitiveScore(players, options);
}
