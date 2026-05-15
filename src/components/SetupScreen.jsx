import { useCallback, useState } from 'react';
import './SetupScreen.css';
import {
  COMPETITIVE_MAX_PLAYERS,
  COMPETITIVE_MIN_PLAYERS,
  COOP_PLAYER_COUNT,
  CPU_PLAYER_NAME,
  GAME_MODES,
  isCoopStyleMode,
} from '../utils/gameRules.js';

function normalizeNamesForMode(names, gameMode) {
  if (gameMode === GAME_MODES.COOP) {
    return [names[0] ?? '', names[1] ?? ''];
  }

  const nextNames = names.slice(0, COMPETITIVE_MAX_PLAYERS);
  while (nextNames.length < COMPETITIVE_MIN_PLAYERS) {
    nextNames.push('');
  }
  return nextNames;
}

export function SetupScreen({ onStart }) {
  const [gameMode, setGameMode] = useState(GAME_MODES.COMPETITIVE);
  const [names, setNames] = useState(() =>
    Array.from({ length: COMPETITIVE_MIN_PLAYERS }, () => '')
  );
  const [player2IsCpu, setPlayer2IsCpu] = useState(false);

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
  const isCoop = gameMode === GAME_MODES.COOP;
  const minPlayers = isCompetitive ? COMPETITIVE_MIN_PLAYERS : COOP_PLAYER_COUNT;
  const maxPlayers = isCompetitive ? COMPETITIVE_MAX_PLAYERS : COOP_PLAYER_COUNT;

  const setName = useCallback((index, value) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const addPlayer = useCallback(() => {
    setNames((prev) =>
      prev.length < COMPETITIVE_MAX_PLAYERS ? [...prev, ''] : prev
    );
  }, []);

  const removePlayer = useCallback(() => {
    setNames((prev) =>
      prev.length > COMPETITIVE_MIN_PLAYERS ? prev.slice(0, -1) : prev
    );
  }, []);

  const togglePlayer2Cpu = useCallback(() => {
    setPlayer2IsCpu((on) => {
      const next = !on;
      if (next) {
        setNames((prev) => {
          const nextNames = [...prev];
          nextNames[1] = '';
          return nextNames;
        });
      }
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (isCoop && player2IsCpu) {
      const playerOne = names[0]?.trim();
      if (!playerOne) return;
      onStart({ gameMode, names: [playerOne], player2IsCpu: true });
      return;
    }
    if (trimmed.length < minPlayers || trimmed.length > maxPlayers) return;
    onStart({ gameMode, names: trimmed, player2IsCpu: false });
  }, [gameMode, isCoop, maxPlayers, minPlayers, names, onStart, player2IsCpu]);

  const selectMode = useCallback((nextMode) => {
    setGameMode(nextMode);
    if (nextMode !== GAME_MODES.COOP) {
      setPlayer2IsCpu(false);
    }
    setNames((prev) => normalizeNamesForMode(prev, nextMode));
  }, []);

  const filledCount = names.map((n) => n.trim()).filter(Boolean).length;
  const playerOneFilled = Boolean(names[0]?.trim());
  const playerTwoFilled = Boolean(names[1]?.trim());
  const canStart = isCompetitive
    ? filledCount >= minPlayers && filledCount <= maxPlayers
    : playerOneFilled && (player2IsCpu || playerTwoFilled);

  return (
    <section className="setup card-rise" aria-labelledby="setup-title">
      <div className="setup-body">
        <h2 id="setup-title" className="setup-title">
          Who is playing?
        </h2>
        <p className="setup-hint">
          Choose a mode, then hand one device around for secret picks.
        </p>

        <div className="setup-mode-grid" role="radiogroup" aria-label="Game mode">
          <button
            type="button"
            className={`setup-mode${isCompetitive ? ' is-active' : ''}`}
            aria-pressed={isCompetitive}
            onClick={() => selectMode(GAME_MODES.COMPETITIVE)}
          >
            <span className="setup-mode-title">Competitive</span>
            <span className="setup-mode-copy">3-6 players · first to 20 wins</span>
          </button>
          <button
            type="button"
            className={`setup-mode${isCoop ? ' is-active' : ''}`}
            aria-pressed={isCoop}
            onClick={() => selectMode(GAME_MODES.COOP)}
          >
            <span className="setup-mode-title">Co-op</span>
            <span className="setup-mode-copy">2 players · reach 20 in 10 rounds · bounty · lightning on 6</span>
          </button>
        </div>

        <p className="setup-hint setup-hint--players">
          {isCompetitive
            ? `${COMPETITIVE_MIN_PLAYERS}-${COMPETITIVE_MAX_PLAYERS} players on one device.`
            : 'Two players on one device — or toggle Player 2 to CPU for solo co-op.'}
        </p>

        <ul className="setup-list">
          {names.map((name, i) => (
            <li key={i} className={`setup-row setup-row--color--${i % 6}`}>
              {isCoop && i === 1 ? (
                <>
                  <div className="setup-row-header">
                    <label className="setup-label" htmlFor={player2IsCpu ? undefined : 'player-1'}>
                      Player 2
                    </label>
                    <button
                      type="button"
                      className={`setup-cpu-toggle${player2IsCpu ? ' is-active' : ''}`}
                      role="switch"
                      aria-checked={player2IsCpu}
                      aria-label={`Player 2: ${player2IsCpu ? CPU_PLAYER_NAME : 'human partner'}`}
                      onClick={togglePlayer2Cpu}
                    >
                      {CPU_PLAYER_NAME}
                    </button>
                  </div>
                  {player2IsCpu ? (
                    <p className="setup-cpu-note">CPU picks automatically each round.</p>
                  ) : (
                    <input
                      id="player-1"
                      className="setup-input"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="words"
                      placeholder="Name 2"
                      value={name}
                      onChange={(e) => setName(i, e.target.value)}
                    />
                  )}
                </>
              ) : (
                <>
                  <label className="setup-label" htmlFor={`player-${i}`}>
                    Player {i + 1}
                  </label>
                  <input
                    id={`player-${i}`}
                    className="setup-input"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="words"
                    placeholder={`Name ${i + 1}`}
                    value={name}
                    onChange={(e) => setName(i, e.target.value)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>

        {isCompetitive && (
          <div className="setup-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={addPlayer}
              disabled={names.length >= COMPETITIVE_MAX_PLAYERS}
            >
              Add player
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={removePlayer}
              disabled={names.length <= COMPETITIVE_MIN_PLAYERS}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      <div className="setup-footer">
        <button
          type="button"
          className={`btn btn-primary btn-block setup-start${isCoopStyleMode(gameMode) ? ' setup-start--coop' : ''}`}
          onClick={handleStart}
          disabled={!canStart}
        >
          Start game
        </button>
      </div>
    </section>
  );
}
