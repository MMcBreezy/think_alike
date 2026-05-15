import {
  BOUNTY_POINTS,
  CHAOS_SCORE_MULTIPLIER,
  COOP_CLOSE_POINTS,
  COOP_CLOSE_RANGE,
  COOP_EXACT_POINTS,
  COOP_FINAL_SYNC_CLOSE_POINTS,
  COOP_FINAL_SYNC_CLOSE_RANGE,
  COOP_FINAL_SYNC_MAX_PICK,
  COOP_FINAL_SYNC_NEAR_POINTS,
  COOP_FINAL_SYNC_NEAR_RANGE,
  COOP_NEAR_POINTS,
  COOP_NEAR_RANGE,
  GAME_MODES,
  LIGHTNING_CLOSE_POINTS,
  LIGHTNING_CLOSE_RANGE,
  LIGHTNING_EXACT_POINTS,
  COMEBACK_LIGHTNING_EXACT_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_ONE_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_RANGE,
  WIN_SCORE,
} from './gameRules.js';

function applyCoopBounty(players, teamPoints, { bountyNumber, bountyClaimed, maxPick }) {
  if (bountyClaimed || !Number.isInteger(bountyNumber) || bountyNumber > maxPick) {
    return {
      teamPoints,
      bountyHit: false,
      bountyWinners: [],
      bountyNumber: null,
    };
  }

  const bountyWinners = [];
  let bonus = 0;

  for (const player of players) {
    if (player.currentGuess === bountyNumber) {
      bonus += BOUNTY_POINTS;
      bountyWinners.push({ id: player.id, name: player.name });
    }
  }

  return {
    teamPoints: teamPoints + bonus,
    bountyHit: bountyWinners.length > 0,
    bountyWinners,
    bountyNumber: bountyWinners.length > 0 ? bountyNumber : null,
  };
}

function withCoopBounty(result, players, options) {
  const { bountyNumber = null, bountyClaimed = false, maxPick = 50 } = options;
  const bounty = applyCoopBounty(players, result.teamPoints ?? 0, {
    bountyNumber,
    bountyClaimed,
    maxPick,
  });

  return {
    ...result,
    teamPoints: bounty.teamPoints,
    bountyHit: bounty.bountyHit,
    bountyWinners: bounty.bountyWinners,
    bountyNumber: bounty.bountyNumber,
  };
}

function applyCompetitiveBounty(players, roundDeltas, { bountyNumber, bountyClaimed, maxPick }) {
  if (bountyClaimed || !Number.isInteger(bountyNumber) || bountyNumber > maxPick) {
    return { bountyHit: false, bountyWinners: [], bountyNumber: null };
  }

  const bountyWinners = [];

  for (const player of players) {
    if (player.currentGuess === bountyNumber) {
      roundDeltas[player.id] = (roundDeltas[player.id] ?? 0) + BOUNTY_POINTS;
      bountyWinners.push({ id: player.id, name: player.name });
    }
  }

  return {
    bountyHit: bountyWinners.length > 0,
    bountyWinners,
    bountyNumber: bountyWinners.length > 0 ? bountyNumber : null,
  };
}

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

export function calculateLightningScore(players, lightningTarget, options = {}) {
  const { bountyNumber = null, bountyClaimed = false, maxPick = 10 } = options;
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

  const bountyResult = applyCompetitiveBounty(players, roundDeltas, {
    bountyNumber,
    bountyClaimed,
    maxPick,
  });

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
    ...bountyResult,
  };
}

export function calculateComebackLightningScore(players, lightningTarget, eligiblePlayerIds) {
  const eligibleIds = new Set(eligiblePlayerIds);
  const roundDeltas = Object.fromEntries(players.map((player) => [player.id, 0]));

  for (const player of players) {
    if (!eligibleIds.has(player.id) || !Number.isInteger(player.currentGuess)) continue;
    const distance = Math.abs(player.currentGuess - lightningTarget);
    if (distance === 0) {
      roundDeltas[player.id] = COMEBACK_LIGHTNING_EXACT_POINTS;
    } else if (distance === 1) {
      roundDeltas[player.id] = COMEBACK_LIGHTNING_OFF_BY_ONE_POINTS;
    } else if (distance <= COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_RANGE) {
      roundDeltas[player.id] = COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_POINTS;
    }
  }

  const updatedPlayers = players.map((player) => ({
    ...player,
    score: player.score + (roundDeltas[player.id] ?? 0),
  }));

  const eligibleWithGuesses = players.filter(
    (player) => eligibleIds.has(player.id) && Number.isInteger(player.currentGuess),
  );
  const anyExact = eligibleWithGuesses.some(
    (player) => player.currentGuess === lightningTarget,
  );
  const anyPoints = eligibleWithGuesses.some(
    (player) => (roundDeltas[player.id] ?? 0) > 0,
  );

  let feedback = 'comeback-lightning-miss';
  if (anyExact) feedback = 'comeback-lightning-hit';
  else if (anyPoints) feedback = 'comeback-lightning-close';

  return {
    mode: GAME_MODES.COMPETITIVE,
    players: updatedPlayers,
    roundDeltas,
    feedback,
    lightningTarget,
    comebackLightningRound: true,
    bountyHit: false,
    bountyWinners: [],
    bountyNumber: null,
  };
}

export function calculateCompetitiveScore(players, options = {}) {
  const {
    chaosRound = false,
    lightningRound = false,
    lightningTarget = null,
    bountyNumber = null,
    bountyClaimed = false,
    maxPick = 50,
  } = options;

  if (lightningRound && Number.isInteger(lightningTarget)) {
    return calculateLightningScore(players, lightningTarget, {
      bountyNumber,
      bountyClaimed,
      maxPick,
    });
  }

  const matches = calculateMatches(players);
  const roundDeltas = Object.fromEntries(players.map((player) => [player.id, 0]));

  for (const match of matches) {
    const points = scoreCompetitiveMatch(match.size, chaosRound);
    for (const playerId of match.playerIds) {
      roundDeltas[playerId] = points;
    }
  }

  const bountyResult = applyCompetitiveBounty(players, roundDeltas, {
    bountyNumber,
    bountyClaimed,
    maxPick,
  });

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
    ...bountyResult,
  };
}

function calculateCoopLightningScore(players, lightningTarget, options = {}) {
  let teamPoints = 0;
  let anyExact = false;
  let anyClose = false;

  for (const player of players) {
    const distance = Math.abs(player.currentGuess - lightningTarget);
    if (distance === 0) {
      teamPoints += LIGHTNING_EXACT_POINTS;
      anyExact = true;
      continue;
    }
    if (distance <= LIGHTNING_CLOSE_RANGE) {
      teamPoints += LIGHTNING_CLOSE_POINTS;
      anyClose = true;
    }
  }

  let feedback = 'lightning-miss';
  if (anyExact) feedback = 'lightning-hit';
  else if (anyClose) feedback = 'lightning-close';

  return withCoopBounty(
    {
      mode: GAME_MODES.COOP,
      teamPoints,
      feedback,
      distance: null,
      lightningTarget,
      lightningRound: true,
      jackpotRound: false,
    },
    players,
    options
  );
}

export function calculateCoopScore(players, options = {}) {
  const {
    chaosRound = false,
    jackpotRound = false,
    lightningRound = false,
    lightningTarget = null,
    bountyNumber = null,
    bountyClaimed = false,
    maxPick = 50,
    teamScore = 0,
    winScore = WIN_SCORE,
  } = options;
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

  if (jackpotRound) {
    const jackpotPoints = Math.max(0, winScore - teamScore);

    if (distance === 0) {
      return withCoopBounty(
        {
          mode: GAME_MODES.COOP,
          teamPoints: jackpotPoints,
          feedback: 'jackpot-sync',
          distance,
          jackpotRound: true,
          jackpotPoints,
          jackpotRange: COOP_FINAL_SYNC_MAX_PICK,
        },
        players,
        options
      );
    }

    if (distance <= COOP_FINAL_SYNC_NEAR_RANGE) {
      return withCoopBounty(
        {
          mode: GAME_MODES.COOP,
          teamPoints: COOP_FINAL_SYNC_NEAR_POINTS,
          feedback: 'jackpot-near',
          distance,
          jackpotRound: true,
          jackpotPoints,
          jackpotRange: COOP_FINAL_SYNC_MAX_PICK,
        },
        players,
        options
      );
    }

    if (distance <= COOP_FINAL_SYNC_CLOSE_RANGE) {
      return withCoopBounty(
        {
          mode: GAME_MODES.COOP,
          teamPoints: COOP_FINAL_SYNC_CLOSE_POINTS,
          feedback: 'jackpot-close',
          distance,
          jackpotRound: true,
          jackpotPoints,
          jackpotRange: COOP_FINAL_SYNC_MAX_PICK,
        },
        players,
        options
      );
    }

    return withCoopBounty(
      {
        mode: GAME_MODES.COOP,
        teamPoints: 0,
        feedback: 'jackpot-miss',
        distance,
        jackpotRound: true,
        jackpotPoints,
        jackpotRange: COOP_FINAL_SYNC_MAX_PICK,
      },
      players,
      options
    );
  }

  if (lightningRound && Number.isInteger(lightningTarget)) {
    return calculateCoopLightningScore(players, lightningTarget, options);
  }

  if (distance === 0) {
    return withCoopBounty(
      {
        mode: GAME_MODES.COOP,
        teamPoints: applyChaosPoints(COOP_EXACT_POINTS),
        feedback: 'perfect-sync',
        distance,
        jackpotRound: false,
        lightningRound: false,
      },
      players,
      options
    );
  }

  if (distance <= COOP_NEAR_RANGE) {
    return withCoopBounty(
      {
        mode: GAME_MODES.COOP,
        teamPoints: applyChaosPoints(COOP_NEAR_POINTS),
        feedback: 'close-sync',
        distance,
        jackpotRound: false,
        lightningRound: false,
      },
      players,
      options
    );
  }

  if (distance <= COOP_CLOSE_RANGE) {
    return withCoopBounty(
      {
        mode: GAME_MODES.COOP,
        teamPoints: applyChaosPoints(COOP_CLOSE_POINTS),
        feedback: 'close-sync',
        distance,
        jackpotRound: false,
        lightningRound: false,
      },
      players,
      options
    );
  }

  return withCoopBounty(
    {
      mode: GAME_MODES.COOP,
      teamPoints: 0,
      feedback: 'no-sync',
      distance,
      jackpotRound: false,
      lightningRound: false,
    },
    players,
    options
  );
}

export function calculateRoundResults(players, gameMode, options = {}) {
  if (gameMode === GAME_MODES.COOP) {
    return calculateCoopScore(players, options);
  }

  return calculateCompetitiveScore(players, options);
}
