import './Scoreboard.css';

export function Scoreboard({ players, winScore, compact = false }) {
  return (
    <div className={`scoreboard${compact ? ' scoreboard--compact' : ''}`}>
      <h3 className="scoreboard-title">Scoreboard</h3>
      <ul className="scoreboard-list">
        {players.map((p) => {
          const pct =
            winScore > 0 ? Math.min(100, Math.max(0, (p.score / winScore) * 100)) : 0;
          return (
            <li key={p.id} className="scoreboard-row">
              <div className="scoreboard-row-top">
                <span className="scoreboard-name">{p.name}</span>
                <span className="scoreboard-fraction">
                  {p.score} / {winScore}
                </span>
              </div>
              <div className="scoreboard-track" aria-hidden>
                <div className="scoreboard-fill" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
