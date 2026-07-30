import type { PositionDisposition } from "./schemas";

const cellBackground = (
  inactive: boolean,
  dropTarget: boolean,
  preference: PositionDisposition,
) => {
  if (inactive) return "var(--colors-bg-muted)";
  if (dropTarget) return "var(--colors-grass-a3)";
  if (preference === "prefer") return "var(--colors-green-subtle-bg)";
  if (preference === "avoid") return "var(--colors-orange-subtle-bg)";
  return undefined;
};

const cellBoxShadow = (options: {
  dropTarget: boolean;
  selected: boolean;
  dragging: boolean;
  validTarget: boolean;
  emphasized: boolean;
  playerColor?: string;
}) => {
  if (options.dropTarget) return "inset 0 0 0 3px var(--colors-grass-9)";
  if (options.selected) return "inset 0 0 0 3px var(--colors-blue-9)";
  if (options.dragging) return "inset 0 0 0 2px var(--colors-fg-default)";
  if (options.validTarget) return "inset 0 0 0 2px var(--colors-grass-9)";
  if (options.emphasized && options.playerColor) {
    return `inset 0 0 0 2px ${options.playerColor}`;
  }
  return undefined;
};

export const assignmentCellVisualStyle = (
  playerColor: string | undefined,
  editable: boolean,
  inactive: boolean,
  dragging: boolean,
  validTarget: boolean,
  dropTarget: boolean,
  emphasized: boolean,
  changed: boolean,
  selected: boolean,
  preference: PositionDisposition,
) => ({
  "background-color": cellBackground(inactive, dropTarget, preference),
  "box-shadow": cellBoxShadow({
    dropTarget,
    selected,
    dragging,
    validTarget,
    emphasized,
    playerColor,
  }),
  outline: changed && !dropTarget && !selected
    ? "2px dashed var(--colors-blue-9)"
    : undefined,
  "outline-offset": changed ? "-3px" : undefined,
  opacity: dragging ? 0.5 : 1,
  filter: "none",
  cursor: editable ? (dragging ? "grabbing" : "grab") : "default",
  "touch-action": editable ? "none" : "auto",
});
