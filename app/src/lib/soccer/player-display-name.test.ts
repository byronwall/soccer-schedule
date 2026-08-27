import { describe, expect, it } from "vitest";
import { compactPlayerNameMap, playerFirstName } from "./player-display-name";
import type { Player } from "./schemas";

const player = (id: string, displayName: string): Player => ({
  id,
  displayName,
  active: true,
  color: "#000000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("compact player names", () => {
  it("uses first names when they are unique", () => {
    const labels = compactPlayerNameMap([player("1", "Maya Brooks"), player("2", "Sofia Carter")]);

    expect(labels.get("1")).toBe("Maya");
    expect(labels.get("2")).toBe("Sofia");
  });

  it("adds the last initial when first names repeat", () => {
    const labels = compactPlayerNameMap([player("1", "Maya Brooks"), player("2", "Maya Carter")]);

    expect(labels.get("1")).toBe("Maya B.");
    expect(labels.get("2")).toBe("Maya C.");
  });

  it("extracts the first name from extra whitespace", () => {
    expect(playerFirstName("  Maya   Brooks ")).toBe("Maya");
  });
});
