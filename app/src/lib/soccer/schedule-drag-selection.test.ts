import { describe, expect, it, vi } from "vitest";
import {
  SCHEDULE_DRAG_ACTIVE_CLASS,
  setScheduleDragSelectionState,
} from "./schedule-drag-selection";

describe("schedule drag selection state", () => {
  it("suppresses selection for an active drag and restores it when canceled", () => {
    const classes = new Set<string>();
    const selection = { removeAllRanges: vi.fn() };
    const body = {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
      },
    };

    setScheduleDragSelectionState(body, true, selection);

    expect(classes).toContain(SCHEDULE_DRAG_ACTIVE_CLASS);
    expect(selection.removeAllRanges).toHaveBeenCalledOnce();

    setScheduleDragSelectionState(body, false, selection);

    expect(classes).not.toContain(SCHEDULE_DRAG_ACTIVE_CLASS);
  });
});
