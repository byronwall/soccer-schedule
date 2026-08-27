import type { Player } from "./schemas";

export const playerFirstName = (displayName: string) =>
  displayName.trim().split(/\s+/)[0] || displayName.trim();

export const compactPlayerNameMap = (players: Player[]) => {
  const firstNameCounts = new Map<string, number>();

  for (const player of players) {
    const firstName = playerFirstName(player.displayName);
    firstNameCounts.set(firstName, (firstNameCounts.get(firstName) ?? 0) + 1);
  }

  return new Map(
    players.map((player) => {
      const parts = player.displayName.trim().split(/\s+/);
      const firstName = parts[0] || player.displayName.trim();
      const lastInitial = parts.at(-1)?.[0];
      const label =
        (firstNameCounts.get(firstName) ?? 0) > 1 && lastInitial
          ? `${firstName} ${lastInitial}.`
          : firstName;
      return [player.id, label];
    }),
  );
};
