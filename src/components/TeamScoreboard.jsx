import { useEffect, useState } from 'react';
import { BOUNTY_MAX_PICK_COOP, BOUNTY_POINTS } from '../utils/gameRules.js';
import { useCountUp } from '../utils/useCountUp.js';
import { BountyClaimants, BountyTestHint } from './Scoreboard.jsx';
import './Scoreboard.css';
import './TeamScoreboard.css';

export function TeamScoreboard({
  teamScore,
  winScore,
  maxRounds,
  jackpotRound = false,
  jackpotNeeded = 0,
  bountyActive = false,
  bountyClaimed = false,
  bountyClaimedBy = [],
  bountyNumber = null,
  players = [],
  bountyMaxPick = BOUNTY_MAX_PICK_COOP,
  showBountyForTesting = false,
  animateScore = false,
  teamPointsGain = 0,
  compact = false,
}) {
  const preRoundScore = Math.max(0, teamScore - teamPointsGain);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    setHighlight(false);
  }, [teamScore, animateScore]);

  const displayedScore = useCountUp(teamScore, {
    start: preRoundScore,
    enabled: animateScore,
    onComplete: () => {
      if (teamPointsGain > 0) setHighlight(true);
    },
  });
  const shownScore = animateScore ? displayedScore : preRoundScore;
  const pct =
    winScore > 0 ? Math.min(100, Math.max(0, (shownScore / winScore) * 100)) : 0;

  const bountyNote = (() => {
    if (bountyActive) {
      return (
        <>
          <p className="scoreboard-bounty scoreboard-bounty--active">
            Bounty active — pick a secret number (1-{bountyMaxPick}) for +{BOUNTY_POINTS} team
            points each
          </p>
          <BountyTestHint
            bountyNumber={bountyNumber}
            showBountyForTesting={showBountyForTesting}
          />
        </>
      );
    }

    if (bountyClaimed && Number.isInteger(bountyNumber)) {
      return (
        <p className="scoreboard-bounty">
          Bounty was {bountyNumber}
          {bountyClaimedBy.length > 0 ? (
            <>
              {' '}
              — claimed by <BountyClaimants claimants={bountyClaimedBy} players={players} />
            </>
          ) : (
            ' — claimed'
          )}
        </p>
      );
    }

    if (bountyClaimed) {
      return (
        <p className="scoreboard-bounty">
          {bountyClaimedBy.length > 0 ? (
            <>
              Bounty claimed by <BountyClaimants claimants={bountyClaimedBy} players={players} />
            </>
          ) : (
            'Bounty claimed'
          )}
        </p>
      );
    }

    return null;
  })();

  const defaultNote = jackpotRound
    ? `Final Sync Jackpot active. Exact sync wins +${jackpotNeeded}.`
    : `Reach ${winScore} points within ${maxRounds} rounds.`;

  return (
    <div className={`scoreboard team-scoreboard${compact ? ' scoreboard--compact' : ''}`}>
      <div
        className={`scoreboard-row team-scoreboard-row${highlight ? ' scoreboard-row--gain' : ''}`}
      >
        <div className="scoreboard-row-top">
          <span className="scoreboard-name">Team Score</span>
          <span className="scoreboard-fraction">
            {shownScore} / {winScore}
          </span>
        </div>
        <div className="scoreboard-track" aria-hidden>
          <div className="scoreboard-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {bountyNote}
      <p className="team-scoreboard-note">{defaultNote}</p>
    </div>
  );
}
