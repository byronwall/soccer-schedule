export const POSITIONS = [
  { key: "goalkeeper", label: "Goalkeeper", short: "GK", group: "goalkeeper", color: "#735F91" },
  { key: "leftDefense", label: "Left Defense", short: "LD", group: "defense", color: "#4773A8" },
  { key: "rightDefense", label: "Right Defense", short: "RD", group: "defense", color: "#3F7885" },
  { key: "leftMidfield", label: "Left Midfield", short: "LM", group: "midfield", color: "#3F7A73" },
  { key: "rightMidfield", label: "Right Midfield", short: "RM", group: "midfield", color: "#657A3D" },
  { key: "leftForward", label: "Left Forward", short: "LF", group: "forward", color: "#9A6A3A" },
  { key: "rightForward", label: "Right Forward", short: "RF", group: "forward", color: "#A94F4F" },
] as const;

export type PositionKey = (typeof POSITIONS)[number]["key"];
export type PositionLabels = Record<PositionKey, string>;

export const DEFAULT_POSITION_LABELS: PositionLabels = Object.fromEntries(
  POSITIONS.map((position) => [position.key, position.label]),
) as PositionLabels;

export const resolvePositions = (labels: PositionLabels) =>
  POSITIONS.map((position) => ({ ...position, label: labels[position.key] }));
export type Position = ReturnType<typeof resolvePositions>[number];

export const SEGMENTS = [
  { key: "q1a", quarter: 1, half: "a", label: "Q1 · 0–7" },
  { key: "q1b", quarter: 1, half: "b", label: "Q1 · 7–14" },
  { key: "q2a", quarter: 2, half: "a", label: "Q2 · 0–7" },
  { key: "q2b", quarter: 2, half: "b", label: "Q2 · 7–14" },
  { key: "q3a", quarter: 3, half: "a", label: "Q3 · 0–7" },
  { key: "q3b", quarter: 3, half: "b", label: "Q3 · 7–14" },
  { key: "q4a", quarter: 4, half: "a", label: "Q4 · 0–7" },
  { key: "q4b", quarter: 4, half: "b", label: "Q4 · 7–14" },
] as const;

export type SegmentKey = (typeof SEGMENTS)[number]["key"];
export type PositionGroup = (typeof POSITIONS)[number]["group"];
export const SEGMENT_SECONDS = 420;
export const TOTAL_ASSIGNMENTS = POSITIONS.length * SEGMENTS.length;
