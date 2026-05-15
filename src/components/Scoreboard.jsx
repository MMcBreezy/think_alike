import { useEffect, useState } from 'react';
import { BOUNTY_MAX_PICK, BOUNTY_POINTS } from '../utils/gameRules.js';
import { useCountUp } from '../utils/useCountUp.js';
import { getPlayerColorIndex } from '../utils/playerColors.js';
import './Scoreboard.css';

export function BountyTestHint({ bountyNumber, showBountyForTesting = false }) {
  if (!showBountyForTesting || !Number.isInteger(bountyNumber)) return null;

  return (
    <p className="scoreboard-bounty scoreboard-bounty--dev" aria-label="Testing only">
      Test: bounty number is {bountyNumber}
    </p>
  );
}

export function BountyClaimants({ claimants, players }) {
  if (!claimants.length) return null;

  return claimants.map((claimant, index) => {
    const colorIndex = getPlayerColorIndex(claimant, players, index);
    const separator =
      index === 0
        ? null
        : index === claimants.length - 1
          ? claimants.length > 2
            ? ', and '
            : ' and '
          : ', ';

    return (
      <span key={claimant.id}>
        {separator}
        <span
          className={`scoreboard-bounty-name scoreboard-bounty-name--color--${colorIndex}`}
        >
          {claimant.name}
        </span>
      </span>
    );
  });
}

function ScoreboardRow({
  player,
  winScore,
  colorIndex,
  roundDelta = 0,
  animateScore = false,
  isWinner = false,
}) {
  const preRoundScore = Math.max(0, player.score - roundDelta);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    setHighlight(false);
  }, [player.score, animateScore]);

  const displayedScore = useCountUp(player.score, {
    start: preRoundScore,
    enabled: animateScore,
    onComplete: () => {
      if (roundDelta > 0) setHighlight(true);
    },
  });
  const shownScore = animateScore ? displayedScore : preRoundScore;
  const pct =
    winScore > 0 ? Math.min(100, Math.max(0, (shownScore / winScore) * 100)) : 0;

  return (
    <li
      className={`scoreboard-row${highlight ? ' scoreboard-row--gain' : ''}${isWinner ? ' scoreboard-row--winner' : ''}`}
    >
      <div className="scoreboard-row-top">
        <span className={`scoreboard-name scoreboard-name--color--${colorIndex}`}>
          {player.name}
        </span>
        <span className="scoreboard-fraction">
          {shownScore} / {winScore}
        </span>
      </div>
      <div className="scoreboard-track" aria-hidden>
        <div
          className="scoreboard-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

export function Scoreboard({
  players,
  winScore,
  bountyActive = false,
  bountyClaimed = false,
  bountyClaimedBy = [],
  bountyNumber = null,
  bountyMaxPick = BOUNTY_MAX_PICK,
  showBountyForTesting = false,
  animateScore = false,
  roundDeltas = null,
  highlightPlayerIds = null,
  compact = false,
}) {
  const bountyNote = (() => {
    if (bountyActive) {
      return (
        <>
          <p className="scoreboard-bounty scoreboard-bounty--active">
            Bounty active — pick a secret number (1-{bountyMaxPick}) for +{BOUNTY_POINTS}
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
              Bounty claimed by{' '}
              <BountyClaimants claimants={bountyClaimedBy} players={players} />
            </>
          ) : (
            'Bounty claimed'
          )}
        </p>
      );
    }

    return null;
  })();

  return (
    <div className={`scoreboard${compact ? ' scoreboard--compact' : ''}`}>
      <h3 className="scoreboard-title">Scoreboard</h3>
      {bountyNote}
      <ul className="scoreboard-list">
        {players.map((p) => {
          const colorIndex = getPlayerColorIndex(p, players);
          const roundDelta = roundDeltas?.[p.id] ?? 0;
          return (
            <ScoreboardRow
              key={p.id}
              player={p}
              winScore={winScore}
              colorIndex={colorIndex}
              roundDelta={roundDelta}
              animateScore={animateScore}
              isWinner={highlightPlayerIds?.includes(p.id)}
            />
          );
        })}
      </ul>
    </div>
  );
}
