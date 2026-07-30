export const SCHEDULE_DRAG_ACTIVE_CLASS = "schedule-drag-active";

type SelectionClassTarget = {
  classList: Pick<DOMTokenList, "add" | "remove">;
};

type SelectionRange = Pick<Selection, "removeAllRanges">;

export const setScheduleDragSelectionState = (
  target: SelectionClassTarget,
  active: boolean,
  selection?: SelectionRange | null,
) => {
  if (active) {
    target.classList.add(SCHEDULE_DRAG_ACTIVE_CLASS);
    selection?.removeAllRanges();
    return;
  }
  target.classList.remove(SCHEDULE_DRAG_ACTIVE_CLASS);
};
