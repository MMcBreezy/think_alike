import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  feedbackBackspace,
  feedbackClear,
  feedbackKeyTap,
  feedbackSubmit,
  primeAudio,
} from '../utils/gameFeedback.js';
import { getPlayerColorIndex } from '../utils/playerColors.js';
import './InputPhase.css';

function tryAppendDigit(prev, digit, maxLen, maxPick) {
  if (prev.length >= maxLen) return prev;
  const next = prev + digit;
  if (next.length > 1 && next.startsWith('0')) return prev;
  const n = Number(next);
  if (n > maxPick) return prev;
  return next;
}

function parseGuess(raw, maxPick) {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1 || n > maxPick) return null;
  return n;
}

function maxDigitsForPick(maxPick) {
  return String(maxPick).length;
}

export function InputPhase({
  players,
  inputPlayerIndices = null,
  currentPlayerIndex,
  maxPick,
  jackpotRound,
  jackpotNeeded,
  lightningRound,
  chaosRound,
  comebackLightningRound = false,
  soloVsCpu = false,
  onSubmitSecret,
  onAdvanceAfterPass,
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [pendingPass, setPendingPass] = useState(false);
  const passBusyRef = useRef(false);

  const turnOrder = inputPlayerIndices ?? players.map((_, index) => index);
  const activePlayerIndex = turnOrder[currentPlayerIndex];
  const nextActivePlayerIndex = turnOrder[currentPlayerIndex + 1];
  const current = players[activePlayerIndex];
  const nextPlayer =
    nextActivePlayerIndex != null ? players[nextActivePlayerIndex] : null;
  const isLastPlayer = soloVsCpu || currentPlayerIndex >= turnOrder.length - 1;
  const maxLen = useMemo(() => maxDigitsForPick(maxPick), [maxPick]);
  const currentColorIndex = getPlayerColorIndex(current, players, activePlayerIndex);
  const nextColorIndex = getPlayerColorIndex(nextPlayer, players, nextActivePlayerIndex ?? 0);

  useEffect(() => {
    passBusyRef.current = false;
  }, [currentPlayerIndex]);

  useEffect(() => {
    setPendingPass(false);
    setDraft('');
    setError('');
  }, [currentPlayerIndex]);

  const displayValue = useMemo(() => draft, [draft]);

  const appendDigit = useCallback(
    (d) => {
      void primeAudio();
      setError('');
      setDraft((prev) => {
        const next = tryAppendDigit(prev, d, maxLen, maxPick);
        if (next !== prev) feedbackKeyTap();
        return next;
      });
    },
    [maxLen, maxPick],
  );

  const backspace = useCallback(() => {
    void primeAudio();
    setError('');
    setDraft((prev) => {
      if (prev.length === 0) return prev;
      feedbackBackspace();
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    void primeAudio();
    setError('');
    setDraft((prev) => {
      if (prev.length === 0) return prev;
      feedbackClear();
      return '';
    });
  }, []);

  const submit = useCallback(() => {
    void primeAudio();
    const value = parseGuess(draft, maxPick);
    if (value == null) {
      setError(`Enter a whole number from 1 to ${maxPick}.`);
      setDraft('');
      return;
    }
    feedbackSubmit();
    setDraft('');
    setError('');
    onSubmitSecret(activePlayerIndex, value);
    if (!isLastPlayer) {
      setPendingPass(true);
    }
  }, [
    activePlayerIndex,
    currentPlayerIndex,
    draft,
    maxPick,
    isLastPlayer,
    onSubmitSecret,
    soloVsCpu,
    turnOrder.length,
  ]);

  const continuePass = useCallback(() => {
    if (passBusyRef.current) return;
    passBusyRef.current = true;
    setPendingPass(false);
    onAdvanceAfterPass();
  }, [onAdvanceAfterPass]);

  if (!current) return null;

  const rangeHint = comebackLightningRound
    ? 'Comeback Lightning · 1-10 · exact +8 · off by 1 +5 · off by 2-3 +2'
    : jackpotRound
      ? `Final Sync Jackpot · 1-${maxPick} · exact +${jackpotNeeded} · off by 1 +2 · off by 2-3 +1`
      : lightningRound
        ? 'Lightning · 1-10 · exact +5 · within 3 +2 · visible only while you type'
        : chaosRound
          ? 'Chaos · 1-20 · double points · visible only while you type'
          : `1-${maxPick} · visible only while you type`;

  return (
    <div
      className={`input-phase-shell${pendingPass ? ' input-phase-shell--pass' : ''}`}
    >
      <section
        className={`input-phase input-phase--play input-turn--${currentColorIndex}${pendingPass ? ' input-phase--inactive' : ''}`}
        aria-labelledby="input-heading"
        aria-hidden={pendingPass}
        data-secret-entry
      >
        <div className="input-phase-top">
          {comebackLightningRound ? (
            <p className="input-comeback-strip" role="status">
              Comeback Lightning — lowest score only. Guess the computer&apos;s number from 1 to{' '}
              {maxPick}.
            </p>
          ) : jackpotRound ? (
            <p className="input-jackpot-strip" role="status">
              Final Sync Jackpot - pick from 1 to {maxPick}. Exact sync wins +{jackpotNeeded}.
            </p>
          ) : lightningRound ? (
            <p className="input-lightning-strip" role="status">
              Lightning round - guess the computer&apos;s number from 1 to {maxPick}
            </p>
          ) : chaosRound ? (
            <p className="input-chaos-strip" role="status">
              Chaos round - pick a number from 1 to {maxPick} for double points
            </p>
          ) : null}

          <h2 id="input-heading" className="input-heading">
            <span
              className={`input-player-name input-player-name--color--${currentColorIndex}`}
            >
              {current.name}
            </span>
            <span className="input-heading-rest">, enter your secret number</span>
          </h2>

          <div className="input-display" aria-live="polite" aria-atomic="true">
            <span className={displayValue ? 'input-display-value' : 'input-display-placeholder'}>
              {displayValue || '—'}
            </span>
          </div>

          {error ? (
            <p className="input-error" role="alert">
              {error}
            </p>
          ) : (
            <p className="input-hint input-hint--turn">{rangeHint}</p>
          )}
        </div>

        <div className="input-phase-bottom">
          <div className="keypad" role="group" aria-label="Number keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button key={d} type="button" className="keypad-key" onClick={() => appendDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className="keypad-key" onClick={clear}>
              Clear
            </button>
            <button type="button" className="keypad-key" onClick={() => appendDigit('0')}>
              0
            </button>
            <button type="button" className="keypad-key" onClick={backspace}>
              ⌫
            </button>
          </div>
          <button type="button" className="btn btn-primary btn-block input-submit" onClick={submit}>
            Submit number
          </button>
        </div>
      </section>

      <section
        className={`input-phase input-phase--pass input-turn--${nextColorIndex}${pendingPass ? ' input-phase--active' : ''}`}
        aria-live="polite"
        aria-hidden={!pendingPass}
      >
        <div className="input-pass-card">
          <p className="input-pass-title">Pass the device</p>
          {nextPlayer ? (
            <p className="input-pass-next">
              Next up:{' '}
              <span className={`input-pass-next-name input-pass-next-name--color--${nextColorIndex}`}>
                {nextPlayer.name}
              </span>
            </p>
          ) : null}
          <p className="input-pass-sub">
            Your number is stored and hidden. Hand the device over, then continue.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={continuePass}>
            {nextPlayer ? `${nextPlayer.name} is ready` : 'Next player ready'}
          </button>
        </div>
      </section>
    </div>
  );
}
