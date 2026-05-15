export const PLAYER_COLOR_COUNT = 6;

export function colorIndexForSeat(seatIndex) {
  return ((seatIndex % PLAYER_COLOR_COUNT) + PLAYER_COLOR_COUNT) % PLAYER_COLOR_COUNT;
}

/** Stable display color for a player (setup seat order). */
export function getPlayerColorIndex(player, players = [], fallbackIndex = 0) {
  if (Number.isInteger(player?.colorIndex)) {
    return colorIndexForSeat(player.colorIndex);
  }
  if (player?.id && players.length > 0) {
    const seat = players.findIndex((p) => p.id === player.id);
    if (seat >= 0) return colorIndexForSeat(seat);
  }
  return colorIndexForSeat(fallbackIndex);
}
