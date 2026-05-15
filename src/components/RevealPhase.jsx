import { useMemo } from 'react';
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
  MAX_PICK_CHAOS,
  MAX_PICK_LIGHTNING,
} from '../utils/gameRules.js';
import './RevealPhase.css';

export function RevealPhase({
  players,
  gameMode,
  roundResult,
  jackpotRound,
  jackpotNeeded,
  lightningRound,
  chaosRound,
  lightningTarget,
  nextLabel = 'Next round',
  onNextRound,
}) {
  const sorted = useMemo(
    () =>
      [...players].sort((a, b) => {
        if (a.currentGuess !== b.currentGuess)
          return a.currentGuess - b.currentGuess;
        return a.name.localeCompare(b.name);
      }),
    [players],
  );

  const isCompetitive = gameMode === GAME_MODES.COMPETITIVE;
  const feedback = roundResult?.feedback ?? null;
  const teamPoints = roundResult?.teamPoints ?? 0;

  return (
    <section className="reveal-phase card-rise" aria-labelledby="reveal-title">
      <h2 id="reveal-title" className="reveal-title">
        The reveal
      </h2>
      {jackpotRound ? (
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
      {roundResult?.bountyHit && Number.isInteger(roundResult.bountyNumber) && (
        <p className="reveal-chaos-note reveal-bounty-note">
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
      )}

      <ul
        className={`reveal-grid${isCompetitive ? ' reveal-grid--competitive' : ''}`}
        style={isCompetitive ? { '--reveal-player-count': sorted.length } : undefined}
      >
        {sorted.map((p, index) => {
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
            <li key={p.id} className="reveal-card">
              <span
                className={`reveal-card-name reveal-card-name--color--${index % 6}`}
              >
                {p.name}
              </span>

              <span className="reveal-card-num">{p.currentGuess}</span>

              {isCompetitive && (
                <span
                  className={`reveal-card-delta ${roundDelta > 0 ? 'is-pos' : 'is-zero'}`}
                >
                  {roundDelta > 0 ? `+${roundDelta} this round` : '+0 this round'}
                </span>
              )}
              {!isCompetitive && lightningRound && (
                <span
                  className={`reveal-card-delta ${lightningPoints > 0 ? 'is-pos' : 'is-zero'}`}
                >
                  {lightningDistance === 0
                    ? 'Exact hit'
                    : lightningDistance != null
                      ? `Off by ${lightningDistance}`
                      : '+0 this round'}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="reveal-messages" role="status">
        {isCompetitive && !lightningRound && feedback === 'no-match' && (
          <p className="reveal-callout reveal-callout-muted">No Match!</p>
        )}
        {isCompetitive && !lightningRound && feedback === 'perfect' && (
          <p className="reveal-callout reveal-callout-celebrate">
            Perfect Match!
          </p>
        )}
        {isCompetitive && lightningRound && feedback === 'lightning-hit' && (
          <p className="reveal-callout reveal-callout-celebrate">Bullseye!</p>
        )}
        {isCompetitive && lightningRound && feedback === 'lightning-close' && (
          <p className="reveal-callout reveal-callout-celebrate">Close Calls!</p>
        )}
        {isCompetitive && lightningRound && feedback === 'lightning-miss' && (
          <p className="reveal-callout reveal-callout-muted">No Lightning Hits</p>
        )}
        {!isCompetitive && (
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
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block reveal-next"
        onClick={onNextRound}
      >
        {nextLabel}
      </button>
    </section>
  );
}
