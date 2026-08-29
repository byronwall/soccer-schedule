import { For, createSignal } from "solid-js";
import {
  type FieldCoordinate,
  type PositionCoordinates,
  type PositionKey,
  type resolvePositions,
} from "~/lib/soccer/fixed-game";

type SoccerFieldDiagramProps = {
  positions: ReturnType<typeof resolvePositions>;
  coordinates: PositionCoordinates;
  editable?: boolean;
  onPositionChange?: (key: PositionKey, coordinate: FieldCoordinate) => void;
  class?: string;
};

type DragState = { key: PositionKey; pointerId: number };

const FIELD = { x: 50, y: 50, width: 900, height: 600 } as const;
const LABEL_BOUNDS = { minX: 0.11, maxX: 0.89, minY: 0.08, maxY: 0.92 } as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const roundCoordinate = (value: number) => Math.round(value * 10_000) / 10_000;

const fieldPoint = (coordinate: FieldCoordinate) => ({
  x: FIELD.x + coordinate.x * FIELD.width,
  y: FIELD.y + coordinate.y * FIELD.height,
});

export function SoccerFieldDiagram(props: SoccerFieldDiagramProps) {
  const [drag, setDrag] = createSignal<DragState>();
  let fieldRef: SVGSVGElement | undefined;

  const coordinateFromPointer = (clientX: number, clientY: number) => {
    const matrix = fieldRef?.getScreenCTM();
    if (!fieldRef || !matrix) return undefined;
    const point = fieldRef.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const field = point.matrixTransform(matrix.inverse());
    return {
      x: roundCoordinate(
        clamp((field.x - FIELD.x) / FIELD.width, LABEL_BOUNDS.minX, LABEL_BOUNDS.maxX),
      ),
      y: roundCoordinate(
        clamp((field.y - FIELD.y) / FIELD.height, LABEL_BOUNDS.minY, LABEL_BOUNDS.maxY),
      ),
    };
  };

  const moveFromPointer = (key: PositionKey, clientX: number, clientY: number) => {
    const coordinate = coordinateFromPointer(clientX, clientY);
    if (coordinate) props.onPositionChange?.(key, coordinate);
  };

  const moveFromKeyboard = (key: PositionKey, event: KeyboardEvent) => {
    if (!props.editable) return;
    const offsets: Partial<Record<string, FieldCoordinate>> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    const step = event.shiftKey ? 0.025 : 0.01;
    const current = props.coordinates[key];
    props.onPositionChange?.(key, {
      x: clamp(current.x + offset.x * step, LABEL_BOUNDS.minX, LABEL_BOUNDS.maxX),
      y: clamp(current.y + offset.y * step, LABEL_BOUNDS.minY, LABEL_BOUNDS.maxY),
    });
  };

  return (
    <svg
      ref={fieldRef}
      class={props.class}
      viewBox="0 0 1000 700"
      role="img"
      aria-label={
        props.editable
          ? "Soccer field position editor. Drag labels or use arrow keys to move them."
          : "Soccer field position guide"
      }
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <marker
          id="field-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="black" />
        </marker>
      </defs>

      <rect width="1000" height="700" rx="18" fill="white" />
      <g fill="none" stroke="black" stroke-width="5">
        <rect x="50" y="50" width="900" height="600" />
        <line x1="500" y1="50" x2="500" y2="650" />
        <circle cx="500" cy="350" r="92" />
        <circle cx="500" cy="350" r="5" fill="black" />

        <rect x="50" y="175" width="160" height="350" />
        <rect x="50" y="260" width="70" height="180" />
        <path d="M 210 270 A 92 92 0 0 1 210 430" />
        <circle cx="155" cy="350" r="5" fill="black" />
        <rect x="30" y="295" width="20" height="110" />

        <rect x="790" y="175" width="160" height="350" />
        <rect x="880" y="260" width="70" height="180" />
        <path d="M 790 270 A 92 92 0 0 0 790 430" />
        <circle cx="845" cy="350" r="5" fill="black" />
        <rect x="950" y="295" width="20" height="110" />

        <path d="M 50 80 A 30 30 0 0 0 80 50" />
        <path d="M 920 50 A 30 30 0 0 0 950 80" />
        <path d="M 50 620 A 30 30 0 0 1 80 650" />
        <path d="M 920 650 A 30 30 0 0 1 950 620" />
      </g>

      <g stroke="black" fill="none" stroke-width="4" stroke-dasharray="16 14">
        <line x1="350" y1="50" x2="350" y2="650" />
        <line x1="650" y1="50" x2="650" y2="650" />
      </g>

      <g fill="black" font-family="system-ui, sans-serif" font-weight="700">
        <text x="500" y="32" text-anchor="middle" font-size="17">
          ATTACKING DIRECTION
        </text>
        <line
          x1="610"
          y1="26"
          x2="760"
          y2="26"
          stroke="black"
          stroke-width="4"
          marker-end="url(#field-arrow)"
        />
      </g>

      <For each={props.positions}>
        {(position) => {
          const point = () => fieldPoint(props.coordinates[position.key]);
          const active = () => drag()?.key === position.key;
          return (
            <g
              role={props.editable ? "button" : undefined}
              tabIndex={props.editable ? 0 : undefined}
              aria-label={
                props.editable
                  ? `${position.short}, ${position.label}. Drag or use arrow keys to move.`
                  : `${position.short}, ${position.label}`
              }
              transform={`translate(${point().x} ${point().y})`}
              style={{
                cursor: props.editable ? (active() ? "grabbing" : "grab") : "default",
                "touch-action": "none",
                outline: "none",
              }}
              onKeyDown={(event) => moveFromKeyboard(position.key, event)}
              onPointerDown={(event) => {
                if (!props.editable) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                setDrag({ key: position.key, pointerId: event.pointerId });
                moveFromPointer(position.key, event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                const current = drag();
                if (current?.key !== position.key || current.pointerId !== event.pointerId) return;
                moveFromPointer(position.key, event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                const current = drag();
                if (current?.key !== position.key || current.pointerId !== event.pointerId) return;
                moveFromPointer(position.key, event.clientX, event.clientY);
                event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag();
              }}
              onPointerCancel={() => setDrag()}
              onLostPointerCapture={() => setDrag()}
            >
              <rect
                x="-86"
                y="-35"
                width="172"
                height="70"
                rx="12"
                fill="white"
                stroke="black"
                stroke-width={active() ? 6 : 5}
              />
              <text
                y="-7"
                text-anchor="middle"
                fill="black"
                font-family="system-ui, sans-serif"
                font-size="23"
                font-weight="800"
              >
                {position.short}
              </text>
              <text
                y="20"
                text-anchor="middle"
                fill="black"
                font-family="system-ui, sans-serif"
                font-size="17"
                font-weight="650"
              >
                {position.label}
              </text>
            </g>
          );
        }}
      </For>
    </svg>
  );
}
