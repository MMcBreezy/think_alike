import { useCallback, useEffect, useReducer, useState } from 'react';
import './App.css';
import { AppMenu } from './components/AppMenu.jsx';
import { SetupScreen } from './components/SetupScreen.jsx';
import { InputPhase } from './components/InputPhase.jsx';
import { RevealPhase } from './components/RevealPhase.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { Scoreboard } from './components/Scoreboard.jsx';
import { TeamScoreboard } from './components/TeamScoreboard.jsx';
import {
  bountyMaxPickForMode,
  COOP_FINAL_SYNC_MAX_PICK,
  GAME_MODES,
  MAX_PICK_LIGHTNING,
  MAX_ROUNDS,
  WIN_SCORE,
  isChaosRound,
  isCoopFinalSyncJackpotRound,
  isLightningRound,
  maxPickForRound,
} from './utils/gameRules.js';
import { calculateRoundResults } from './utils/scoring.js';
import { readShowBountyForTesting, writeShowBountyForTesting } from './utils/devPreferences.js';

function createPlayer(name, index, gameMode) {
  const basePlayer = {
    id: `p-${index}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}`}`,
    name: name.trim(),
    currentGuess: null,
  };

  if (gameMode === GAME_MODES.COMPETITIVE) {
    return {
      ...basePlayer,
      score: 0,
    };
  }

  return basePlayer;
}

function clearGuesses(players) {
  return players.map((player) => ({ ...player, currentGuess: null }));
}

function resetPlayersForReplay(players, gameMode) {
  return players.map((player) => {
    if (gameMode === GAME_MODES.COMPETITIVE) {
      return {
        ...player,
        score: 0,
        currentGuess: null,
      };
    }

    return {
      id: player.id,
      name: player.name,
      currentGuess: null,
    };
  });
}

function randomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createLightningTarget(round, gameMode) {
  if (!isLightningRound(round, gameMode)) return null;
  return randomIntInclusive(1, MAX_PICK_LIGHTNING);
}

function createBountyNumber(gameMode) {
  return randomIntInclusive(1, bountyMaxPickForMode(gameMode));
}

function getCoopFeedbackLabel(feedback) {
  if (feedback === 'perfect-sync') return 'Perfect Sync!';
  if (feedback === 'close-sync') return 'Close Sync!';
  if (feedback === 'jackpot-sync') return 'Final Sync Jackpot!';
  if (feedback === 'jackpot-near') return 'So close!';
  if (feedback === 'jackpot-close') return 'Almost there';
  if (feedback === 'jackpot-miss') return 'Jackpot missed';
  if (feedback === 'lightning-hit') return 'Bullseye!';
  if (feedback === 'lightning-close') return 'Close Calls!';
  if (feedback === 'lightning-miss') return 'No Lightning Hits';
  return 'No Sync this round';
}

function createCoopRoundHistoryEntry(round, players, roundResult, teamScoreAfter, chaosRound) {
  return {
    round,
    chaosRound,
    lightningRound: Boolean(roundResult.lightningRound),
    jackpotRound: Boolean(roundResult.jackpotRound),
    bountyRound: Boolean(roundResult.bountyHit),
    feedback: roundResult.feedback,
    feedbackLabel: getCoopFeedbackLabel(roundResult.feedback),
    teamPoints: roundResult.teamPoints,
    teamScoreAfter,
    guesses: players.map((player) => ({
      id: player.id,
      name: player.name,
      value: player.currentGuess,
    })),
  };
}

const initialState = {
  gameMode: GAME_MODES.COMPETITIVE,
  players: [],
  teamScore: 0,
  roundHistory: [],
  lightningTarget: null,
  bountyNumber: null,
  bountyClaimed: false,
  bountyClaimedBy: [],
  currentPlayerIndex: 0,
  round: 1,
  phase: 'setup',
  winnerIds: [],
  roundResult: null,
  pendingFinalOutcome: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START': {
      const { gameMode } = action;
      const names = action.names.filter(Boolean);
      const players = names.map((name, index) => createPlayer(name, index, gameMode));
      return {
        ...initialState,
        gameMode,
        players,
        teamScore: 0,
        roundHistory: [],
        lightningTarget: createLightningTarget(1, gameMode),
        bountyNumber: createBountyNumber(gameMode),
        bountyClaimed: false,
        bountyClaimedBy: [],
        phase: 'input',
        round: 1,
      };
    }
    case 'ADVANCE_AFTER_PASS': {
      if (state.phase !== 'input') return state;
      if (state.currentPlayerIndex >= state.players.length - 1) return state;
      return {
        ...state,
        currentPlayerIndex: state.currentPlayerIndex + 1,
      };
    }
    case 'SUBMIT_SECRET': {
      const { playerIndex, value } = action;
      if (state.phase !== 'input') return state;
      if (playerIndex < 0 || playerIndex >= state.players.length) return state;
      if (state.players[playerIndex]?.currentGuess != null) return state;
      const lightningRound = isLightningRound(state.round, state.gameMode);
      const chaosRound = isChaosRound(state.round, state.gameMode);
      const coopJackpotRound = isCoopFinalSyncJackpotRound(
        state.round,
        state.gameMode,
        state.teamScore,
        WIN_SCORE
      );
      const maxPick = coopJackpotRound
        ? COOP_FINAL_SYNC_MAX_PICK
        : maxPickForRound(state.round, state.gameMode);
      if (!Number.isInteger(value) || value < 1 || value > maxPick) return state;
      const nextPlayers = state.players.map((p, i) =>
        i === playerIndex ? { ...p, currentGuess: value } : p
      );
      if (playerIndex < state.players.length - 1) {
        return {
          ...state,
          players: nextPlayers,
        };
      }

      const roundResult = calculateRoundResults(nextPlayers, state.gameMode, {
        chaosRound,
        jackpotRound: coopJackpotRound,
        lightningRound,
        lightningTarget: state.lightningTarget,
        bountyNumber: state.bountyNumber,
        bountyClaimed: state.bountyClaimed,
        maxPick,
        teamScore: state.teamScore,
        winScore: WIN_SCORE,
      });

      if (state.gameMode === GAME_MODES.COMPETITIVE) {
        const bountyClaimed = state.bountyClaimed || Boolean(roundResult.bountyHit);
        const bountyClaimedBy = roundResult.bountyHit
          ? roundResult.bountyWinners
          : state.bountyClaimedBy;
        const winnerIds = roundResult.players
          .filter((player) => player.score >= WIN_SCORE)
          .map((player) => player.id);
        if (winnerIds.length > 0) {
          return {
            ...state,
            players: roundResult.players,
            currentPlayerIndex: 0,
            phase: 'winner',
            winnerIds,
            roundResult,
            lightningTarget: state.lightningTarget,
            bountyClaimed,
            bountyClaimedBy,
            pendingFinalOutcome: null,
          };
        }

        return {
          ...state,
          players: roundResult.players,
          currentPlayerIndex: 0,
          phase: 'reveal',
          roundResult,
          lightningTarget: state.lightningTarget,
          bountyClaimed,
          bountyClaimedBy,
          pendingFinalOutcome: null,
        };
      }

      const bountyClaimed = state.bountyClaimed || Boolean(roundResult.bountyHit);
      const bountyClaimedBy = roundResult.bountyHit
        ? roundResult.bountyWinners
        : state.bountyClaimedBy;
      const teamScore = state.teamScore + roundResult.teamPoints;
      const roundHistory = [
        ...state.roundHistory,
        createCoopRoundHistoryEntry(state.round, nextPlayers, roundResult, teamScore, chaosRound),
      ];
      const pendingFinalOutcome =
        teamScore >= WIN_SCORE ? 'win' : state.round >= MAX_ROUNDS ? 'lose' : null;

      return {
        ...state,
        players: nextPlayers,
        teamScore,
        roundHistory,
        lightningTarget: null,
        bountyClaimed,
        bountyClaimedBy,
        currentPlayerIndex: 0,
        phase: 'reveal',
        roundResult,
        pendingFinalOutcome,
        winnerIds: [],
      };
    }
    case 'NEXT_ROUND': {
      if (state.phase !== 'reveal') return state;

      if (state.gameMode === GAME_MODES.COOP && state.pendingFinalOutcome) {
        return {
          ...state,
          players: clearGuesses(state.players),
          lightningTarget: null,
          currentPlayerIndex: 0,
          phase: state.pendingFinalOutcome === 'win' ? 'winner' : 'loser',
          roundResult: null,
          pendingFinalOutcome: null,
        };
      }

      const nextRound = state.round + 1;
      return {
        ...state,
        players: clearGuesses(state.players),
        lightningTarget: createLightningTarget(nextRound, state.gameMode),
        currentPlayerIndex: 0,
        round: nextRound,
        phase: 'input',
        roundResult: null,
        pendingFinalOutcome: null,
      };
    }
    case 'PLAY_AGAIN': {
      return {
        ...state,
        players: resetPlayersForReplay(state.players, state.gameMode),
        teamScore: 0,
        roundHistory: [],
        lightningTarget: createLightningTarget(1, state.gameMode),
        bountyNumber: createBountyNumber(state.gameMode),
        bountyClaimed: false,
        bountyClaimedBy: [],
        currentPlayerIndex: 0,
        round: 1,
        phase: 'input',
        winnerIds: [],
        roundResult: null,
        pendingFinalOutcome: null,
      };
    }
    case 'NEW_GAME':
      return initialState;
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [showBountyForTesting, setShowBountyForTesting] = useState(readShowBountyForTesting);
  const {
    gameMode,
    players,
    teamScore,
    roundHistory,
    lightningTarget,
    bountyNumber,
    bountyClaimed,
    bountyClaimedBy,
    currentPlayerIndex,
    round,
    phase,
    winnerIds,
    roundResult,
    pendingFinalOutcome,
  } = state;

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
  const bountyActive = !bountyClaimed && Number.isInteger(bountyNumber);
  const bountyMaxPick = bountyMaxPickForMode(gameMode);
  const lightningRound = isLightningRound(round, gameMode);
  const chaosRound = isChaosRound(round, gameMode);
  const coopJackpotRound =
    phase === 'reveal' && gameMode === GAME_MODES.COOP
      ? Boolean(roundResult?.jackpotRound)
      : isCoopFinalSyncJackpotRound(round, gameMode, teamScore, WIN_SCORE);
  const jackpotNeeded = coopJackpotRound
    ? phase === 'reveal' && roundResult?.jackpotRound
      ? roundResult.jackpotPoints ?? 0
      : Math.max(0, WIN_SCORE - teamScore)
    : 0;
  const maxPick = coopJackpotRound ? COOP_FINAL_SYNC_MAX_PICK : maxPickForRound(round, gameMode);

  const startGame = useCallback(({ gameMode: nextGameMode, names }) => {
    dispatch({ type: 'START', gameMode: nextGameMode, names });
  }, []);

  const handleSecretSubmit = useCallback((playerIndex, value) => {
    dispatch({ type: 'SUBMIT_SECRET', playerIndex, value });
  }, []);

  const advanceAfterPass = useCallback(() => {
    dispatch({ type: 'ADVANCE_AFTER_PASS' });
  }, []);

  const nextRound = useCallback(() => {
    dispatch({ type: 'NEXT_ROUND' });
  }, []);

  const playAgain = useCallback(() => {
    dispatch({ type: 'PLAY_AGAIN' });
  }, []);

  const newGame = useCallback(() => {
    dispatch({ type: 'NEW_GAME' });
  }, []);

  const toggleShowBountyForTesting = useCallback(() => {
    setShowBountyForTesting((on) => {
      const next = !on;
      writeShowBountyForTesting(next);
      return next;
    });
  }, []);

  const winners = players.filter((player) => winnerIds.includes(player.id));
  const competitiveWinners = winners.map((player) => ({
    id: player.id,
    name: player.name,
    colorIndex: players.findIndex((p) => p.id === player.id) % 6,
  }));
  const winnerThemeIndex =
    competitiveWinners.length === 1 ? competitiveWinners[0].colorIndex : -1;

  const showAppMenu = phase === 'setup' || players.length > 0;
  const showMatchMenuActions = phase !== 'setup' && players.length > 0;
  const showRoundBadge = phase !== 'setup' && phase !== 'winner' && phase !== 'loser';
  const isSpecialRound = lightningRound || chaosRound || coopJackpotRound;
  const [badgePulse, setBadgePulse] = useState(false);

  useEffect(() => {
    if (!showRoundBadge || !isSpecialRound) return undefined;
    setBadgePulse(true);
    const timer = window.setTimeout(() => setBadgePulse(false), 1400);
    return () => clearTimeout(timer);
  }, [round, isSpecialRound, showRoundBadge]);
  const turnThemeClass =
    phase === 'input' && players.length > 0
      ? ` app--turn--${currentPlayerIndex % 6}`
      : phase === 'winner' && isCompetitive && winnerThemeIndex >= 0
        ? ` app--turn--${winnerThemeIndex % 6}`
        : '';
  const appSub = 'Great minds think alike';
  const roundBadgeLabel = isCompetitive
    ? `Round ${round}${lightningRound ? ' · Lightning' : chaosRound ? ' · Chaos' : ''}`
    : `Round ${round} / ${MAX_ROUNDS}${coopJackpotRound ? ' · Final Sync Jackpot' : chaosRound ? ' · Chaos' : ''}`;

  return (
    <div
      className={`app${phase === 'setup' ? ' app--setup' : ''}${phase === 'input' ? ' app--input-play' : ''}${phase === 'winner' && isCompetitive ? ' app--winner-play' : ''}${turnThemeClass}`}
    >
      <header
        className={`app-header${phase === 'input' ? ' app-header--tight' : ''}${showAppMenu ? ' app-header--has-menu' : ''}`}
      >
        {showAppMenu && (
          <AppMenu
            gameMode={gameMode}
            showMatchActions={showMatchMenuActions}
            showBountyForTesting={showBountyForTesting}
            onToggleShowBounty={toggleShowBountyForTesting}
            onResetMatch={playAgain}
            onQuitToSetup={newGame}
          />
        )}
        <div className="app-header-copy">
          <h1 className="app-title">Think Alike</h1>
          <p className="app-sub">{appSub}</p>
          {showRoundBadge && (
            <span
              className={`round-badge${chaosRound ? ' round-badge--chaos' : ''}${lightningRound ? ' round-badge--lightning' : ''}${coopJackpotRound ? ' round-badge--jackpot' : ''}${badgePulse ? ' round-badge--pulse' : ''}`}
            >
              {roundBadgeLabel}
            </span>
          )}
        </div>
      </header>

      {phase === 'setup' && <SetupScreen onStart={startGame} />}

      {phase === 'input' && players.length > 0 && (
        <div className="app-input-flow">
          <div className="app-live-scoreboard">
            {isCompetitive ? (
              <Scoreboard
                players={players}
                winScore={WIN_SCORE}
                bountyActive={bountyActive}
                bountyClaimed={bountyClaimed}
                bountyClaimedBy={bountyClaimedBy}
                bountyNumber={bountyNumber}
                bountyMaxPick={bountyMaxPick}
                showBountyForTesting={showBountyForTesting}
                compact
              />
            ) : (
              <TeamScoreboard
                teamScore={teamScore}
                winScore={WIN_SCORE}
                maxRounds={MAX_ROUNDS}
                jackpotRound={coopJackpotRound}
                jackpotNeeded={jackpotNeeded}
                bountyActive={bountyActive}
                bountyClaimed={bountyClaimed}
                bountyClaimedBy={bountyClaimedBy}
                bountyNumber={bountyNumber}
                players={players}
                bountyMaxPick={bountyMaxPick}
                showBountyForTesting={showBountyForTesting}
                compact
              />
            )}
          </div>
          <InputPhase
            key={`input-round-${round}`}
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            maxPick={maxPick}
            jackpotRound={coopJackpotRound}
            jackpotNeeded={jackpotNeeded}
            lightningRound={lightningRound}
            chaosRound={chaosRound}
            onSubmitSecret={handleSecretSubmit}
            onAdvanceAfterPass={advanceAfterPass}
          />
        </div>
      )}

      {phase === 'reveal' && players.length > 0 && (
        <>
          <div className="app-live-scoreboard">
            {isCompetitive ? (
              <Scoreboard
                players={players}
                winScore={WIN_SCORE}
                bountyActive={bountyActive}
                bountyClaimed={bountyClaimed}
                bountyClaimedBy={bountyClaimedBy}
                bountyNumber={bountyNumber}
                bountyMaxPick={bountyMaxPick}
                showBountyForTesting={showBountyForTesting}
                animateScore
                roundDeltas={roundResult?.roundDeltas}
                compact
              />
            ) : (
              <TeamScoreboard
                teamScore={teamScore}
                winScore={WIN_SCORE}
                maxRounds={MAX_ROUNDS}
                jackpotRound={coopJackpotRound}
                jackpotNeeded={jackpotNeeded}
                bountyActive={bountyActive}
                bountyClaimed={bountyClaimed}
                bountyClaimedBy={bountyClaimedBy}
                bountyNumber={bountyNumber}
                players={players}
                bountyMaxPick={bountyMaxPick}
                showBountyForTesting={showBountyForTesting}
                animateScore
                teamPointsGain={roundResult?.teamPoints ?? 0}
                compact
              />
            )}
          </div>
          <RevealPhase
            players={players}
            gameMode={gameMode}
            roundResult={roundResult}
            jackpotRound={coopJackpotRound}
            jackpotNeeded={jackpotNeeded}
            lightningRound={lightningRound}
            chaosRound={chaosRound}
            lightningTarget={lightningTarget}
            nextLabel={pendingFinalOutcome ? 'See results' : 'Next round'}
            onNextRound={nextRound}
          />
        </>
      )}

      {phase === 'winner' && (!isCompetitive || winners.length > 0) && (
        isCompetitive ? (
          <div className="app-winner-flow">
            <div className="app-live-scoreboard">
              <Scoreboard
                players={players}
                winScore={WIN_SCORE}
                bountyActive={bountyActive}
                bountyClaimed={bountyClaimed}
                bountyClaimedBy={bountyClaimedBy}
                bountyNumber={bountyNumber}
                bountyMaxPick={bountyMaxPick}
                showBountyForTesting={showBountyForTesting}
                highlightPlayerIds={winnerIds}
                compact
              />
            </div>
            <WinnerScreen
              variant="win"
              winners={competitiveWinners}
              themeIndex={winnerThemeIndex >= 0 ? winnerThemeIndex : undefined}
              headline={
                competitiveWinners.length > 1 ? 'Win Think Alike!' : 'Wins Think Alike!'
              }
              subtitle={`First to ${WIN_SCORE} points wins.`}
              finalPlayers={players}
              finalRoundResult={roundResult}
              lightningRound={lightningRound}
              chaosRound={chaosRound}
              lightningTarget={lightningTarget}
              onPlayAgain={playAgain}
              onNewGame={newGame}
            />
          </div>
        ) : (
          <WinnerScreen
            variant="win"
            headline="Perfect teamwork!"
            subtitle={`You reached ${teamScore} / ${WIN_SCORE} in ${round} rounds.`}
            roundHistory={roundHistory}
            onPlayAgain={playAgain}
            onNewGame={newGame}
          />
        )
      )}

      {phase === 'loser' && (
        <WinnerScreen
          variant="lose"
          headline="Out of rounds"
          subtitle={`You finished with ${teamScore} / ${WIN_SCORE} after ${MAX_ROUNDS} rounds.`}
          roundHistory={roundHistory}
          onPlayAgain={playAgain}
          onNewGame={newGame}
        />
      )}
    </div>
  );
}
