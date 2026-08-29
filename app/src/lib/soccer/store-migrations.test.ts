import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_COORDINATES, DEFAULT_POSITION_LABELS } from "./fixed-game";
import { migrateSoccerStore } from "./store-migrations";

describe("soccer store migrations", () => {
  it("adds the default printable field layout to version-six stores", () => {
    const migrated = migrateSoccerStore({
      schemaVersion: 6,
      teamDisplayName: "Mystics",
      seasonName: "Fall 2026",
      positionLabels: DEFAULT_POSITION_LABELS,
      players: [],
      games: [],
      availability: [],
      schedules: [],
      liveGames: [],
      playerPreferences: { schemaVersion: 1, entries: [] },
      users: [],
      sessions: [],
    });

    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.positionCoordinates).toEqual(DEFAULT_POSITION_COORDINATES);
  });
});
