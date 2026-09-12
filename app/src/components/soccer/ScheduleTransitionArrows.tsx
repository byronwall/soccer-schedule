import { For } from "solid-js";
import { SEGMENTS, type Position, type PositionKey } from "~/lib/soccer/fixed-game";
import type { Assignment, Player } from "~/lib/soccer/schemas";

type MidQuarterMovement = {
  playerId: string;
  playerColor: string;
  playerName: string;
  quarter: number;
  from: PositionKey;
  to: PositionKey;
};

export const midQuarterMovements = (
  assignments: Assignment[],
  players: Player[],
): MidQuarterMovement[] =>
  SEGMENTS.filter((segment) => segment.half === "a").flatMap((first) => {
    const second = SEGMENTS.find(
      (segment) => segment.quarter === first.quarter && segment.half === "b",
    );
    if (!second) return [];

    return assignments
      .filter((item) => item.segmentKey === first.key)
      .flatMap((from) => {
        const to = assignments.find(
          (item) => item.segmentKey === second.key && item.playerId === from.playerId,
        );
        const player = players.find((item) => item.id === from.playerId);
        return to && to.positionKey !== from.positionKey && player
          ? [
              {
                playerId: player.id,
                playerColor: player.color,
                playerName: player.displayName,
                quarter: first.quarter,
                from: from.positionKey,
                to: to.positionKey,
              },
            ]
          : [];
      });
  });

export function ScheduleTransitionArrows(props: {
  assignments: Assignment[];
  players: Player[];
  positions: Position[];
  emphasizedPlayerId?: string;
  labelColumnWidth?: number;
}) {
  const movements = () => midQuarterMovements(props.assignments, props.players);
  const row = (key: PositionKey) => props.positions.findIndex((position) => position.key === key);
  const labelColumnWidth = () => props.labelColumnWidth ?? 128;

  return (
    <span
      role="img"
      aria-label="Mid-quarter position changes"
      style={{
        position: "absolute",
        inset: `0 0 0 ${labelColumnWidth()}px`,
        width: `calc(100% - ${labelColumnWidth()}px)`,
        height: "100%",
        display: "block",
        "pointer-events": "none",
      }}
    >
      <svg
        viewBox="0 0 800 700"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", inset: "0", width: "100%", height: "100%" }}
      >
        <For each={movements()}>
          {(movement) => {
            const x1 = (movement.quarter - 1) * 200 + 78;
            const x2 = x1 + 44;
            const y1 = (row(movement.from) + 0.5) * 100;
            const y2 = (row(movement.to) + 0.5) * 100;
            const path = `M ${x1} ${y1} C ${x1 + 22} ${y1}, ${x2 - 22} ${y2}, ${x2} ${y2}`;
            const opacity = () =>
              props.emphasizedPlayerId && props.emphasizedPlayerId !== movement.playerId
                ? 0.12
                : 0.9;
            return (
              <g opacity={opacity()}>
                <title>{`${movement.playerName} moves from ${movement.from} to ${movement.to} midway through quarter ${movement.quarter}`}</title>
                <path
                  d={path}
                  fill="none"
                  stroke="var(--colors-bg-default)"
                  stroke-width="6"
                  vector-effect="non-scaling-stroke"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={movement.playerColor}
                  stroke-width={props.emphasizedPlayerId === movement.playerId ? "3.5" : "2.5"}
                  stroke-linecap="round"
                  vector-effect="non-scaling-stroke"
                />
              </g>
            );
          }}
        </For>
      </svg>
      <For each={movements()}>
        {(movement) => {
          const x1 = (movement.quarter - 1) * 200 + 78;
          const x2 = x1 + 44;
          const y1 = (row(movement.from) + 0.5) * 100;
          const y2 = (row(movement.to) + 0.5) * 100;
          const opacity = () =>
            props.emphasizedPlayerId && props.emphasizedPlayerId !== movement.playerId ? 0.12 : 0.9;
          return (
            <>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${(x1 / 800) * 100}%`,
                  top: `${(y1 / 700) * 100}%`,
                  width: "6px",
                  height: "6px",
                  "border-radius": "50%",
                  background: movement.playerColor,
                  opacity: opacity(),
                  transform: "translate(-50%, -50%)",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${(x2 / 800) * 100}%`,
                  top: `${(y2 / 700) * 100}%`,
                  width: "0",
                  height: "0",
                  "border-top": "5px solid transparent",
                  "border-bottom": "5px solid transparent",
                  "border-left": `8px solid ${movement.playerColor}`,
                  opacity: opacity(),
                  transform: "translate(-8px, -50%)",
                }}
              />
            </>
          );
        }}
      </For>
    </span>
  );
}
