import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './InputPhase.css';

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
  currentPlayerIndex,
  maxPick,
  lightningRound,
  chaosRound,
  onSubmitSecret,
  onAdvanceAfterPass,
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [pendingPass, setPendingPass] = useState(false);
  const passBusyRef = useRef(false);

  const current = players[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex >= players.length - 1;
  const maxLen = useMemo(() => maxDigitsForPick(maxPick), [maxPick]);

  useEffect(() => {
    passBusyRef.current = false;
  }, [currentPlayerIndex]);

  const displayValue = useMemo(() => draft, [draft]);

  const appendDigit = useCallback(
    (d) => {
      setError('');
      setDraft((prev) => {
        if (prev.length >= maxLen) return prev;
        const next = prev + d;
        if (next.length > 1 && next.startsWith('0')) return prev;
        const n = Number(next);
        if (n > maxPick) return prev;
        return next;
      });
    },
    [maxLen, maxPick]
  );

  const backspace = useCallback(() => {
    setError('');
    setDraft((prev) => prev.slice(0, -1));
  }, []);

  const clear = useCallback(() => {
    setError('');
    setDraft('');
  }, []);

  const submit = useCallback(() => {
    const value = parseGuess(draft, maxPick);
    if (value == null) {
      setError(`Enter a whole number from 1 to ${maxPick}.`);
      setDraft('');
      return;
    }
    setDraft('');
    setError('');
    onSubmitSecret(currentPlayerIndex, value);
    if (!isLastPlayer) {
      setPendingPass(true);
    }
  }, [draft, maxPick, currentPlayerIndex, isLastPlayer, onSubmitSecret]);

  const continuePass = useCallback(() => {
    if (passBusyRef.current) return;
    passBusyRef.current = true;
    setPendingPass(false);
    onAdvanceAfterPass();
  }, [onAdvanceAfterPass]);

  if (!current) return null;

  if (pendingPass) {
    return (
      <section className="input-phase input-phase--pass card-rise" aria-live="polite">
        <div className="input-pass-card">
          <p className="input-pass-title">Pass to the next player</p>
          <p className="input-pass-sub">
            Your number is stored and is not shown on this screen. Hand the device over, then continue.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={continuePass}>
            Next player ready
          </button>
        </div>
      </section>
    );
  }

  const rangeHint = lightningRound
    ? 'Lightning · 1-10 · exact +5 · within 3 +2 · visible only while you type'
    : chaosRound
      ? 'Chaos · 1-20 · double points · visible only while you type'
      : `1-${maxPick} · visible only while you type`;

  return (
    <section
      className={`input-phase input-phase--play input-turn--${currentPlayerIndex % 6} card-rise`}
      aria-labelledby="input-heading"
      data-secret-entry
    >
      <div className="input-phase-top">
        {lightningRound ? (
          <p className="input-lightning-strip" role="status">
            Lightning round - guess the computer&apos;s number from 1 to {maxPick}
          </p>
        ) : chaosRound ? (
          <p className="input-chaos-strip" role="status">
            Chaos round - pick a number from 1 to {maxPick} for double points
          </p>
        ) : null}

        <h2 id="input-heading" className="input-heading">
          <span className="input-player-name">{current.name}</span>
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
  );
}
