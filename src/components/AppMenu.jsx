import { useCallback, useEffect, useRef, useState } from 'react';
import './AppMenu.css';
import { GAME_MODES } from '../utils/gameRules.js';

export function AppMenu({
  gameMode,
  showMatchActions = true,
  soundVolumePercent = 100,
  onSoundVolumeChange,
  showBountyForTesting = false,
  onToggleShowBounty,
  onResetMatch,
  onQuitToSetup,
}) {
  const [open, setOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
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

  const handleToggleShowBounty = useCallback(() => {
    onToggleShowBounty?.();
  }, [onToggleShowBounty]);

  const handleVolumeChange = useCallback(
    (event) => {
      onSoundVolumeChange?.(Number(event.target.value));
    },
    [onSoundVolumeChange],
  );

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
          <div className="app-menu-sound" role="presentation">
            <label className="app-menu-volume" htmlFor="app-menu-sound-volume">
              <span className="app-menu-volume-label">Sound volume</span>
              <span className="app-menu-volume-value">{soundVolumePercent}%</span>
            </label>
            <input
              id="app-menu-sound-volume"
              type="range"
              className="app-menu-volume-slider"
              min={0}
              max={100}
              step={5}
              value={soundVolumePercent}
              onChange={handleVolumeChange}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={soundVolumePercent}
              aria-label="Sound volume"
            />
          </div>
          <div className="app-menu-divider" role="separator" />
          <div
            className={`app-menu-section app-menu-section--collapsible${devOpen ? ' app-menu-section--open' : ''}`}
            role="presentation"
          >
            <button
              type="button"
              className="app-menu-section-trigger"
              aria-expanded={devOpen}
              aria-controls="app-menu-dev-panel"
              onClick={() => setDevOpen((expanded) => !expanded)}
            >
              <span className="app-menu-section-label">Developer</span>
              <span className="app-menu-chevron" aria-hidden />
            </button>
            <div
              id="app-menu-dev-panel"
              className="app-menu-section-panel"
              hidden={!devOpen}
            >
              <div className="app-menu-section-panel-inner">
                <label
                  className="app-menu-toggle"
                  role="menuitemcheckbox"
                  aria-checked={showBountyForTesting}
                >
                  <input
                    type="checkbox"
                    className="app-menu-toggle-input"
                    checked={showBountyForTesting}
                    onChange={handleToggleShowBounty}
                  />
                  <span className="app-menu-toggle-box" aria-hidden />
                  <span className="app-menu-toggle-label">Show bounty number</span>
                </label>
              </div>
            </div>
          </div>
          {showMatchActions && (
            <>
              <div className="app-menu-divider" role="separator" />
              <button type="button" className="app-menu-item" role="menuitem" onClick={handleReset}>
                Reset match
              </button>
              <button
                type="button"
                className="app-menu-item app-menu-item--danger"
                role="menuitem"
                onClick={handleQuit}
              >
                Quit to setup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
