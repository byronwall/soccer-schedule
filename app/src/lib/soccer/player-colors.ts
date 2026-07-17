export const PLAYER_COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#9333EA",
  "#EA580C",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
  "#65A30D",
  "#C026D3",
  "#0D9488",
  "#D97706",
  "#7C3AED",
  "#0284C7",
  "#BE123C",
  "#059669",
  "#B45309",
  "#4338CA",
  "#A21CAF",
  "#15803D",
] as const;

export const isPlayerColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9A-F]{6}$/i.test(value);

export const pickPlayerColor = (usedColors: Iterable<string>, randomIndex: (length: number) => number) => {
  const used = new Set([...usedColors].map((color) => color.toUpperCase()));
  const available = PLAYER_COLORS.filter((color) => !used.has(color));
  const candidates = available.length > 0 ? available : PLAYER_COLORS;
  return candidates[randomIndex(candidates.length)];
};
