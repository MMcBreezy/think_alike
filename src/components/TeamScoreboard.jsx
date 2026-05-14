import './Scoreboard.css';
import './TeamScoreboard.css';

export function TeamScoreboard({
  teamScore,
  winScore,
  maxRounds,
  jackpotRound = false,
  jackpotNeeded = 0,
  compact = false,
}) {
  const pct = winScore > 0 ? Math.min(100, Math.max(0, (teamScore / winScore) * 100)) : 0;
  const note = jackpotRound
    ? `Final Sync Jackpot active. Exact sync wins +${jackpotNeeded}.`
    : `Reach ${winScore} points within ${maxRounds} rounds.`;

  return (
    <div className={`scoreboard team-scoreboard${compact ? ' scoreboard--compact' : ''}`}>
      <div className="scoreboard-row-top">
        <span className="scoreboard-name">Team Score</span>
        <span className="scoreboard-fraction">
          {teamScore} / {winScore}
        </span>
      </div>
      <div className="scoreboard-track" aria-hidden>
        <div className="scoreboard-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="team-scoreboard-note">{note}</p>
    </div>
  );
}
