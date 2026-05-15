import { useMemo } from 'react';
import './WinnerScreen.css';

export function WinnerScreen({
  highlight = '',
  headline,
  subtitle,
  variant = 'win',
  themeIndex,
  finalPlayers,
  finalRoundResult,
  lightningRound = false,
  chaosRound = false,
  lightningTarget = null,
  roundHistory,
  onPlayAgain,
  onNewGame,
}) {
  const finalResults = useMemo(() => {
    if (!finalPlayers?.length) return [];

    const sorted = [...finalPlayers].sort((a, b) => {
      if (lightningRound && Number.isInteger(lightningTarget)) {
        const distanceDiff =
          Math.abs(a.currentGuess - lightningTarget) - Math.abs(b.currentGuess - lightningTarget);
        if (distanceDiff !== 0) return distanceDiff;
      }
      if (a.currentGuess !== b.currentGuess) return a.currentGuess - b.currentGuess;
      return a.name.localeCompare(b.name);
    });

    return sorted.map((player) => {
      const roundDelta = finalRoundResult?.roundDeltas?.[player.id] ?? 0;
      const distance =
        lightningRound && Number.isInteger(lightningTarget)
          ? Math.abs(player.currentGuess - lightningTarget)
          : null;

      let detail = roundDelta > 0 ? `+${roundDelta} this round` : '+0 this round';
      if (lightningRound && distance != null) {
        if (distance === 0) detail = 'Exact hit';
        else detail = `Off by ${distance}`;
      }

      return {
        id: player.id,
        name: player.name,
        currentGuess: player.currentGuess,
        score: player.score,
        roundDelta,
        detail,
      };
    });
  }, [finalPlayers, finalRoundResult, lightningRound, lightningTarget]);

  return (
    <section
      className={`winner winner--${variant}${variant === 'win' && themeIndex != null ? ` winner--theme--${themeIndex}` : ''} card-rise`}
      aria-live="polite"
    >
      <div className="winner-glow" aria-hidden />
      <h2 className="winner-title">
        {highlight ? (
          <>
            <span className="winner-name">{highlight}</span> {headline}
          </>
        ) : (
          headline
        )}
      </h2>
      <p className="winner-sub">{subtitle}</p>
      {finalResults.length > 0 && (
        <div className="winner-final-results">
          <h3 className="winner-history-title">
            {lightningRound ? 'Lightning results' : chaosRound ? 'Chaos results' : 'Winning round'}
          </h3>
          {lightningRound && Number.isInteger(lightningTarget) && (
            <p className="winner-final-target">Target: {lightningTarget}</p>
          )}
          <ul className="winner-final-grid">
            {finalResults.map((player) => (
              <li key={player.id} className="winner-final-item">
                <div className="winner-final-top">
                  <span className="winner-final-name">{player.name}</span>
                  <span className="winner-final-total">{player.score} total</span>
                </div>
                <div className="winner-final-bottom">
                  <span className="winner-final-guess">{player.currentGuess}</span>
                  <span
                    className={`winner-final-detail ${player.roundDelta > 0 ? 'is-pos' : 'is-zero'}`}
                  >
                    {player.detail}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {roundHistory?.length > 0 && (
        <div className="winner-history">
          <h3 className="winner-history-title">Round results</h3>
          <ul className="winner-history-list">
            {roundHistory.map((entry) => (
              <li key={entry.round} className="winner-history-item">
                <div className="winner-history-top">
                  <span className="winner-history-round">
                    Round {entry.round}
                    {entry.jackpotRound ? ' · Jackpot' : ''}
                    {entry.bountyRound ? ' · Bounty' : ''}
                    {entry.lightningRound ? ' · Lightning' : ''}
                    {entry.chaosRound ? ' · Chaos' : ''}
                  </span>
                  <span
                    className={`winner-history-points ${
                      entry.teamPoints > 0 ? 'is-pos' : 'is-zero'
                    }`}
                  >
                    +{entry.teamPoints}
                  </span>
                </div>
                <p className="winner-history-meta">
                  <span className="winner-history-sync">{entry.feedbackLabel}</span>
                  <span className="winner-history-total">Total {entry.teamScoreAfter}</span>
                </p>
                <p className="winner-history-guesses">
                  {entry.guesses.map((guess) => `${guess.name}: ${guess.value}`).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="winner-actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onPlayAgain}>
          Play again
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onNewGame}>
          New game
        </button>
      </div>
    </section>
  );
}
