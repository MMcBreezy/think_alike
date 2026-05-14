import { useCallback, useReducer } from 'react';
import './App.css';
import { AppMenu } from './components/AppMenu.jsx';
import { SetupScreen } from './components/SetupScreen.jsx';
import { InputPhase } from './components/InputPhase.jsx';
import { RevealPhase } from './components/RevealPhase.jsx';
import { WinnerScreen } from './components/WinnerScreen.jsx';
import { Scoreboard } from './components/Scoreboard.jsx';
import { TeamScoreboard } from './components/TeamScoreboard.jsx';
import {
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

function getCoopFeedbackLabel(feedback) {
  if (feedback === 'perfect-sync') return 'Perfect Sync!';
  if (feedback === 'close-sync') return 'Close Sync!';
  if (feedback === 'jackpot-sync') return 'Final Sync Jackpot!';
  if (feedback === 'jackpot-near') return 'So close!';
  if (feedback === 'jackpot-close') return 'Almost there';
  if (feedback === 'jackpot-miss') return 'Jackpot missed';
  return 'No Sync this round';
}

function createCoopRoundHistoryEntry(round, players, roundResult, teamScoreAfter, chaosRound) {
  return {
    round,
    chaosRound,
    jackpotRound: Boolean(roundResult.jackpotRound),
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
  currentPlayerIndex: 0,
  round: 1,
  phase: 'setup',
  winnerId: null,
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
        teamScore: state.teamScore,
        winScore: WIN_SCORE,
      });

      if (state.gameMode === GAME_MODES.COMPETITIVE) {
        const winner = roundResult.players.find((player) => player.score >= WIN_SCORE);
        if (winner) {
          return {
            ...state,
            players: roundResult.players,
            currentPlayerIndex: 0,
            phase: 'winner',
            winnerId: winner.id,
            roundResult,
            lightningTarget: state.lightningTarget,
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
          pendingFinalOutcome: null,
        };
      }

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
        currentPlayerIndex: 0,
        phase: 'reveal',
        roundResult,
        pendingFinalOutcome,
        winnerId: null,
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
        currentPlayerIndex: 0,
        round: 1,
        phase: 'input',
        winnerId: null,
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
  const {
    gameMode,
    players,
    teamScore,
    roundHistory,
    lightningTarget,
    currentPlayerIndex,
    round,
    phase,
    winnerId,
    roundResult,
    pendingFinalOutcome,
  } = state;

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
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

  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;
  const winnerThemeIndex = winner ? players.findIndex((p) => p.id === winner.id) : -1;

  const showGameMenu = phase !== 'setup' && players.length > 0;
  const showRoundBadge = phase !== 'setup' && phase !== 'winner' && phase !== 'loser';
  const turnThemeClass =
    phase === 'input' && players.length > 0 ? ` app--turn--${currentPlayerIndex % 6}` : '';
  const appSub = isCompetitive
    ? `Match minds. First to ${WIN_SCORE} wins.`
    : `Match minds together. Reach ${WIN_SCORE} in ${MAX_ROUNDS} rounds.`;
  const roundBadgeLabel = isCompetitive
    ? `Round ${round}${lightningRound ? ' · Lightning' : chaosRound ? ' · Chaos' : ''}`
    : `Round ${round} / ${MAX_ROUNDS}${coopJackpotRound ? ' · Final Sync Jackpot' : chaosRound ? ' · Chaos' : ''}`;

  return (
    <div
      className={`app${phase === 'setup' ? ' app--setup' : ''}${phase === 'input' ? ' app--input-play' : ''}${turnThemeClass}`}
    >
      <header
        className={`app-header${phase === 'input' ? ' app-header--tight' : ''}${showGameMenu ? ' app-header--has-menu' : ''}`}
      >
        {showGameMenu && (
          <AppMenu
            gameMode={gameMode}
            onResetMatch={playAgain}
            onQuitToSetup={newGame}
          />
        )}
        <div className="app-header-copy">
          <h1 className="app-title">Think Alike</h1>
          <p className="app-sub">{appSub}</p>
          {showRoundBadge && (
            <span
              className={`round-badge${chaosRound ? ' round-badge--chaos' : ''}${lightningRound ? ' round-badge--lightning' : ''}`}
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
              <Scoreboard players={players} winScore={WIN_SCORE} compact />
            ) : (
              <TeamScoreboard
                teamScore={teamScore}
                winScore={WIN_SCORE}
                maxRounds={MAX_ROUNDS}
                jackpotRound={coopJackpotRound}
                jackpotNeeded={jackpotNeeded}
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
              <Scoreboard players={players} winScore={WIN_SCORE} compact />
            ) : (
              <TeamScoreboard
                teamScore={teamScore}
                winScore={WIN_SCORE}
                maxRounds={MAX_ROUNDS}
                jackpotRound={coopJackpotRound}
                jackpotNeeded={jackpotNeeded}
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

      {phase === 'winner' && (!isCompetitive || winner) && (
        <WinnerScreen
          variant="win"
          highlight={isCompetitive ? winner?.name : ''}
          themeIndex={isCompetitive && winnerThemeIndex >= 0 ? winnerThemeIndex % 6 : undefined}
          headline={isCompetitive ? 'Wins Think Alike!' : 'Perfect teamwork!'}
          subtitle={
            isCompetitive
              ? `First to ${WIN_SCORE} points wins.`
              : `You reached ${teamScore} / ${WIN_SCORE} in ${round} rounds.`
          }
          finalPlayers={isCompetitive ? players : undefined}
          finalRoundResult={isCompetitive ? roundResult : undefined}
          lightningRound={isCompetitive ? lightningRound : false}
          chaosRound={isCompetitive ? chaosRound : false}
          lightningTarget={isCompetitive ? lightningTarget : null}
          roundHistory={!isCompetitive ? roundHistory : undefined}
          onPlayAgain={playAgain}
          onNewGame={newGame}
        />
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
