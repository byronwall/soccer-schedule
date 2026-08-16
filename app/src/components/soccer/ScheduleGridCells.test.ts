import { describe, expect, it } from "vitest";
import { assignmentCellVisualStyle } from "~/lib/soccer/schedule-cell-visuals";

const style = (options: {
  preference?: "prefer" | "neutral" | "avoid";
  selected?: boolean;
  changed?: boolean;
  target?: boolean;
}) =>
  assignmentCellVisualStyle(
    "#2563EB",
    true,
    false,
    false,
    false,
    options.target ?? false,
    false,
    options.changed ?? false,
    options.selected ?? false,
    options.preference ?? "neutral",
  );

describe("assignment cell visual precedence", () => {
  it("keeps preference tint independent of lock/source state", () => {
    expect(style({ preference: "prefer" })["background-color"]).toBe(
      "var(--colors-green-subtle-bg)",
    );
    expect(style({ preference: "avoid" })["background-color"]).toBe(
      "var(--colors-orange-subtle-bg)",
    );
  });

  it("orders drag target, selected, and changed states clearly without warning rings", () => {
    expect(style({ target: true, selected: true })["box-shadow"]).toContain("grass");
    expect(style({ selected: true, changed: true })["box-shadow"]).toContain("blue");
    expect(style({ changed: true }).outline).toContain("dashed");
  });
});
