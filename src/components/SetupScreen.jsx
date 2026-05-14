import { useCallback, useState } from 'react';
import './SetupScreen.css';
import {
  COMPETITIVE_MAX_PLAYERS,
  COMPETITIVE_MIN_PLAYERS,
  COOP_PLAYER_COUNT,
  GAME_MODES,
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

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
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

  const handleStart = useCallback(() => {
    const trimmed = names.map((n) => n.trim()).filter(Boolean);
    if (trimmed.length < minPlayers || trimmed.length > maxPlayers) return;
    onStart({ gameMode, names: trimmed });
  }, [gameMode, maxPlayers, minPlayers, names, onStart]);

  const selectMode = useCallback((nextMode) => {
    setGameMode(nextMode);
    setNames((prev) => normalizeNamesForMode(prev, nextMode));
  }, []);

  const filledNames = names.map((n) => n.trim()).filter(Boolean).length;
  const canStart = filledNames >= minPlayers && filledNames <= maxPlayers;

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
            className={`setup-mode${!isCompetitive ? ' is-active' : ''}`}
            aria-pressed={!isCompetitive}
            onClick={() => selectMode(GAME_MODES.COOP)}
          >
            <span className="setup-mode-title">Co-op</span>
            <span className="setup-mode-copy">2 players · reach 20 in 10 rounds</span>
          </button>
        </div>

        <p className="setup-hint setup-hint--players">
          {isCompetitive
            ? `${COMPETITIVE_MIN_PLAYERS}-${COMPETITIVE_MAX_PLAYERS} players on one device.`
            : 'Exactly 2 players on one device.'}
        </p>

        <ul className="setup-list">
          {names.map((name, i) => (
            <li key={i} className={`setup-row setup-row--color--${i % 6}`}>
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
          className={`btn btn-primary btn-block setup-start${!isCompetitive ? ' setup-start--coop' : ''}`}
          onClick={handleStart}
          disabled={!canStart}
        >
          Start game
        </button>
      </div>
    </section>
  );
}
