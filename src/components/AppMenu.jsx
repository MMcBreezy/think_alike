import { useCallback, useEffect, useRef, useState } from 'react';
import './AppMenu.css';
import { GAME_MODES } from '../utils/gameRules.js';

export function AppMenu({ gameMode, onResetMatch, onQuitToSetup }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, [open, close]);

  const handleReset = useCallback(() => {
    const resetCopy =
      gameMode === GAME_MODES.COOP
        ? 'Reset this match? Team score returns to 0, round restarts at 1, and you go back to secret picks with the same players.'
        : 'Reset this match? Scores return to 0, round restarts at 1, and you go back to secret picks with the same players.';

    if (
      !window.confirm(resetCopy)
    ) {
      return;
    }
    onResetMatch();
    close();
  }, [close, gameMode, onResetMatch]);

  const handleQuit = useCallback(() => {
    if (!window.confirm('Quit to setup? You will enter player names again.')) {
      return;
    }
    onQuitToSetup();
    close();
  }, [close, onQuitToSetup]);

  return (
    <div className="app-menu" ref={rootRef}>
      <button
        type="button"
        className="app-menu-trigger"
        aria-label="Menu"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="app-menu-dropdown"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="app-menu-bars" aria-hidden />
      </button>
      {open && (
        <div id="app-menu-dropdown" className="app-menu-dropdown" role="menu">
          <button type="button" className="app-menu-item" role="menuitem" onClick={handleReset}>
            Reset match
          </button>
          <button type="button" className="app-menu-item app-menu-item--danger" role="menuitem" onClick={handleQuit}>
            Quit to setup
          </button>
        </div>
      )}
    </div>
  );
}
