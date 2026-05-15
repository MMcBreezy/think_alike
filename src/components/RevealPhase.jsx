import { useCallback, useEffect, useMemo, useState } from 'react';
import { BountyClaimants } from './Scoreboard.jsx';
import {
  BOUNTY_POINTS,
  COOP_FINAL_SYNC_CLOSE_RANGE,
  COOP_FINAL_SYNC_CLOSE_POINTS,
  COOP_FINAL_SYNC_MAX_PICK,
  COOP_FINAL_SYNC_NEAR_POINTS,
  COOP_FINAL_SYNC_NEAR_RANGE,
  GAME_MODES,
  LIGHTNING_CLOSE_RANGE,
  LIGHTNING_CLOSE_POINTS,
  LIGHTNING_EXACT_POINTS,
  COMEBACK_LIGHTNING_EXACT_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_ONE_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_POINTS,
  COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_RANGE,
  MAX_PICK_CHAOS,
  MAX_PICK_LIGHTNING,
} from '../utils/gameRules.js';
import {
  feedbackBountyClaim,
  feedbackCompetitiveReveal,
  competitiveRevealDelaysBounty,
  feedbackNumberMatch,
  isNumberMatchFeedback,
} from '../utils/gameFeedback.js';
import { usePrefersReducedMotion } from '../utils/usePrefersReducedMotion.js';
import { getPlayerColorIndex } from '../utils/playerColors.js';
import './RevealPhase.css';

const REVEAL_STEP_MS = 380;
const CALLOUT_DELAY_MS = 220;

export function RevealPhase({
  players,
  gameMode,
  roundResult,
  jackpotRound,
  jackpotNeeded,
  lightningRound,
  chaosRound,
  comebackLightningRound = false,
  comebackEligiblePlayerIds = [],
  lightningTarget,
  nextLabel = 'Next round',
  onNextRound,
  onCardsRevealed,
}) {
  const reducedMotion = usePrefersReducedMotion();
  const eligibleIds = useMemo(
    () => new Set(comebackEligiblePlayerIds),
    [comebackEligiblePlayerIds],
  );
  const displayPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => getPlayerColorIndex(a, players) - getPlayerColorIndex(b, players),
      ),
    [players],
  );

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
  const feedback = roundResult?.feedback ?? null;
  const teamPoints = roundResult?.teamPoints ?? 0;
  const revealKey = useMemo(
    () => displayPlayers.map((player) => `${player.id}:${player.currentGuess}`).join('|'),
    [displayPlayers],
  );

  const [revealedCount, setRevealedCount] = useState(() =>
    reducedMotion ? displayPlayers.length : 0,
  );
  const [showCallout, setShowCallout] = useState(reducedMotion);

  const revealComplete = revealedCount >= displayPlayers.length && showCallout;

  const skipReveal = useCallback(() => {
    setRevealedCount(displayPlayers.length);
    setShowCallout(true);
  }, [displayPlayers.length]);

  useEffect(() => {
    if (reducedMotion) {
      setRevealedCount(displayPlayers.length);
      setShowCallout(true);
      return undefined;
    }

    setRevealedCount(0);
    setShowCallout(false);

    if (displayPlayers.length === 0) {
      const calloutTimer = window.setTimeout(() => setShowCallout(true), CALLOUT_DELAY_MS);
      return () => clearTimeout(calloutTimer);
    }

    let cardIndex = 0;
    let calloutTimer = 0;
    const cardTimer = window.setInterval(() => {
      cardIndex += 1;
      setRevealedCount(cardIndex);
      if (cardIndex >= displayPlayers.length) {
        window.clearInterval(cardTimer);
        calloutTimer = window.setTimeout(() => setShowCallout(true), CALLOUT_DELAY_MS);
      }
    }, REVEAL_STEP_MS);

    return () => {
      window.clearInterval(cardTimer);
      if (calloutTimer) window.clearTimeout(calloutTimer);
    };
  }, [revealKey, displayPlayers.length, reducedMotion]);

  const cardsRevealed = revealedCount >= displayPlayers.length;

  useEffect(() => {
    if (cardsRevealed) onCardsRevealed?.();
  }, [cardsRevealed, onCardsRevealed]);

  useEffect(() => {
    if (!showCallout) return;
    if (gameMode === GAME_MODES.COMPETITIVE) {
      feedbackCompetitiveReveal(feedback);
      return;
    }
    if (!isNumberMatchFeedback(feedback, gameMode)) return;
    feedbackNumberMatch();
  }, [showCallout, feedback, gameMode, revealKey]);

  const bountyClaimedThisRound =
    Boolean(roundResult?.bountyHit) && Number.isInteger(roundResult?.bountyNumber);

  useEffect(() => {
    if (!showCallout || !bountyClaimedThisRound) return undefined;

    const delayMs =
      (gameMode === GAME_MODES.COMPETITIVE && competitiveRevealDelaysBounty(feedback)) ||
      isNumberMatchFeedback(feedback, gameMode)
        ? 480
        : 0;
    const timer = window.setTimeout(() => feedbackBountyClaim(), delayMs);
    return () => window.clearTimeout(timer);
  }, [showCallout, bountyClaimedThisRound, feedback, gameMode, revealKey]);

  const calloutContent = (() => {
    if (isCompetitive && comebackLightningRound && feedback === 'comeback-lightning-hit') {
      return <p className="reveal-callout reveal-callout-celebrate">Comeback Bullseye!</p>;
    }
    if (isCompetitive && comebackLightningRound && feedback === 'comeback-lightning-close') {
      return <p className="reveal-callout reveal-callout-celebrate">Comeback Close Calls!</p>;
    }
    if (isCompetitive && comebackLightningRound && feedback === 'comeback-lightning-miss') {
      return <p className="reveal-callout reveal-callout-muted">No Comeback Hits</p>;
    }
    if (isCompetitive && !lightningRound && !comebackLightningRound && feedback === 'no-match') {
      return <p className="reveal-callout reveal-callout-muted">No Match!</p>;
    }
    if (isCompetitive && !lightningRound && !comebackLightningRound && feedback === 'perfect') {
      return (
        <p className="reveal-callout reveal-callout-celebrate">Perfect Match!</p>
      );
    }
    if (isCompetitive && !lightningRound && !comebackLightningRound && feedback === 'match') {
      const sizes = roundResult?.matches?.map((m) => m.size) ?? [];
      const biggest = sizes.length ? Math.max(...sizes) : 2;
      const label =
        biggest >= 4 ? `${biggest}-player match!` : biggest === 3 ? 'Triple match!' : 'Pair match!';
      return <p className="reveal-callout reveal-callout-celebrate">{label}</p>;
    }
    if (isCompetitive && lightningRound && feedback === 'lightning-hit') {
      return <p className="reveal-callout reveal-callout-celebrate">Bullseye!</p>;
    }
    if (isCompetitive && lightningRound && feedback === 'lightning-close') {
      return <p className="reveal-callout reveal-callout-celebrate">Close Calls!</p>;
    }
    if (isCompetitive && lightningRound && feedback === 'lightning-miss') {
      return <p className="reveal-callout reveal-callout-muted">No Lightning Hits</p>;
    }
    if (!isCompetitive) {
      return (
        <div className="reveal-coop-summary">
          <p
            className={`reveal-callout ${
              feedback === 'perfect-sync' ||
              feedback === 'close-sync' ||
              feedback === 'jackpot-sync' ||
              feedback === 'lightning-hit' ||
              feedback === 'lightning-close'
                ? 'reveal-callout-celebrate'
                : 'reveal-callout-muted'
            }`}
          >
            {feedback === 'perfect-sync' && 'Perfect Sync!'}
            {feedback === 'close-sync' && 'Close Sync!'}
            {feedback === 'jackpot-sync' && 'Final Sync Jackpot!'}
            {feedback === 'jackpot-near' && 'So close!'}
            {feedback === 'jackpot-close' && 'Almost there'}
            {feedback === 'jackpot-miss' && 'Jackpot missed'}
            {feedback === 'lightning-hit' && 'Bullseye!'}
            {feedback === 'lightning-close' && 'Close Calls!'}
            {feedback === 'lightning-miss' && 'No Lightning Hits'}
            {feedback === 'no-sync' && 'No Sync this round'}
          </p>
          <p className={`reveal-team-points ${teamPoints > 0 ? 'is-pos' : 'is-zero'}`}>
            {teamPoints > 0
              ? `+${teamPoints} team point${teamPoints === 1 ? '' : 's'}`
              : '+0 team points'}
          </p>
        </div>
      );
    }
    return null;
  })();

  return (
    <section className="reveal-phase card-rise" aria-labelledby="reveal-title">
      <div className="reveal-phase-head">
        <h2 id="reveal-title" className="reveal-title">
          The reveal
        </h2>
        {!revealComplete && !reducedMotion ? (
          <button type="button" className="reveal-skip" onClick={skipReveal}>
            Skip
          </button>
        ) : null}
      </div>

      {comebackLightningRound ? (
        <p className="reveal-chaos-note reveal-comeback-note">
          Comeback Lightning — target was {lightningTarget ?? roundResult?.lightningTarget ?? '?'}.
          Lowest score only. Exact +{COMEBACK_LIGHTNING_EXACT_POINTS}, off by 1 +
          {COMEBACK_LIGHTNING_OFF_BY_ONE_POINTS}, off by 2-{COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_RANGE}{' '}
          +{COMEBACK_LIGHTNING_OFF_BY_TWO_THREE_POINTS}. Picks were 1-{MAX_PICK_LIGHTNING}.
        </p>
      ) : jackpotRound ? (
        <p className="reveal-chaos-note reveal-jackpot-note">
          Final Sync Jackpot - picks were 1-
          {roundResult?.jackpotRange ?? COOP_FINAL_SYNC_MAX_PICK}. Exact sync won +{jackpotNeeded}.
          Off by {COOP_FINAL_SYNC_NEAR_RANGE} was +{COOP_FINAL_SYNC_NEAR_POINTS}; off by
          2-{COOP_FINAL_SYNC_CLOSE_RANGE} was +{COOP_FINAL_SYNC_CLOSE_POINTS}.
        </p>
      ) : lightningRound ? (
        <p className="reveal-chaos-note reveal-lightning-note">
          Lightning round - target was {lightningTarget ?? roundResult?.lightningTarget ?? '?'}.
          Exact +{LIGHTNING_EXACT_POINTS}, within {LIGHTNING_CLOSE_RANGE} +{LIGHTNING_CLOSE_POINTS}.
          Picks were 1-{MAX_PICK_LIGHTNING}.
        </p>
      ) : chaosRound ? (
        <p className="reveal-chaos-note">
          Chaos round - picks were 1-{MAX_PICK_CHAOS} and this round was worth double points.
        </p>
      ) : null}

      {showCallout &&
      roundResult?.bountyHit &&
      Number.isInteger(roundResult.bountyNumber) ? (
        <p className="reveal-chaos-note reveal-bounty-note reveal-note-enter">
          Bounty claimed! The number was {roundResult.bountyNumber}.{' '}
          {roundResult.bountyWinners?.length ? (
            isCompetitive ? (
              roundResult.bountyWinners
                .map((winner) => `${winner.name} +${BOUNTY_POINTS}`)
                .join(' · ')
            ) : (
              <>
                <BountyClaimants claimants={roundResult.bountyWinners} players={players} />{' '}
                (+{BOUNTY_POINTS} team points each)
              </>
            )
          ) : null}
        </p>
      ) : null}

      <ul
        className={`reveal-grid${isCompetitive ? ' reveal-grid--competitive' : ''}`}
        style={isCompetitive ? { '--reveal-player-count': displayPlayers.length } : undefined}
      >
        {displayPlayers.map((p, index) => {
          const isRevealed = index < revealedCount;
          const colorIndex = getPlayerColorIndex(p, players);
          const isSatOut = comebackLightningRound && !eligibleIds.has(p.id);
          const roundDelta = roundResult?.roundDeltas?.[p.id] ?? 0;
          const lightningTargetValue =
            lightningTarget ?? roundResult?.lightningTarget ?? null;
          const lightningDistance =
            lightningRound && Number.isInteger(lightningTargetValue)
              ? Math.abs(p.currentGuess - lightningTargetValue)
              : null;
          const lightningPoints =
            lightningDistance === 0
              ? LIGHTNING_EXACT_POINTS
              : lightningDistance != null && lightningDistance <= LIGHTNING_CLOSE_RANGE
                ? LIGHTNING_CLOSE_POINTS
                : 0;

          return (
            <li
              key={p.id}
              className={`reveal-card${isRevealed ? ' reveal-card--revealed' : ''}`}
            >
              <span
                className={`reveal-card-name reveal-card-name--color--${colorIndex}`}
              >
                {p.name}
              </span>

              <span className="reveal-card-num-wrap">
                {isRevealed ? (
                  isSatOut ? (
                    <span className="reveal-card-sat-out">Sat out</span>
                  ) : (
                    <span className="reveal-card-num reveal-card-num--shown">{p.currentGuess}</span>
                  )
                ) : (
                  <span className="reveal-card-num reveal-card-num--masked">
                    {isSatOut ? '—' : '?'}
                  </span>
                )}
              </span>

              {isRevealed && isCompetitive ? (
                <span
                  className={`reveal-card-delta reveal-card-delta--enter ${roundDelta > 0 ? 'is-pos' : 'is-zero'}`}
                >
                  {roundDelta > 0 ? `+${roundDelta} this round` : '+0 this round'}
                </span>
              ) : null}
              {isRevealed && !isCompetitive && lightningRound ? (
                <span
                  className={`reveal-card-delta reveal-card-delta--enter ${lightningPoints > 0 ? 'is-pos' : 'is-zero'}`}
                >
                  {lightningDistance === 0
                    ? 'Exact hit'
                    : lightningDistance != null
                      ? `Off by ${lightningDistance}`
                      : '+0 this round'}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div
        className={`reveal-messages${showCallout ? ' reveal-messages--visible' : ''}`}
        role="status"
        aria-hidden={!showCallout}
      >
        {showCallout ? calloutContent : null}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block reveal-next"
        onClick={onNextRound}
        disabled={!revealComplete}
      >
        {nextLabel}
      </button>
    </section>
  );
}
