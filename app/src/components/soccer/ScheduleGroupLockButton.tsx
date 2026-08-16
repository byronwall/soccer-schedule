import { Lock, LockKeyhole, LockOpen } from "lucide-solid";
import { IconButton, Tooltip } from "~/components/ui";
import type { LockState } from "~/lib/soccer/schedule-readiness";

type ScheduleGroupLockButtonProps = {
  label: string;
  state: LockState;
  disabled?: boolean;
  onLock: () => void;
};

export function ScheduleGroupLockButton(props: ScheduleGroupLockButtonProps) {
  const actionLabel = () =>
    props.state === "all" ? "Unlock all filled assignments" : "Lock all filled assignments";

  return (
    <Tooltip
      content={`${actionLabel()} for ${props.label}.`}
      positioning={{
        strategy: "fixed",
        flip: true,
        slide: true,
        shift: 8,
        overflowPadding: 12,
      }}
      openDelay={150}
    >
      <IconButton
        size="2xs"
        variant="plain"
        disabled={props.disabled}
        aria-pressed={props.state === "some" ? "mixed" : props.state === "all"}
        aria-label={`${actionLabel()} for ${props.label}.`}
        data-lock-state={props.state}
        style={{
          color:
            props.state === "all"
              ? "var(--colors-grass-fg)"
              : props.state === "some"
                ? "var(--colors-blue-fg)"
                : "var(--colors-fg-muted)",
          "background-color":
            props.state === "all"
              ? "var(--colors-grass-subtle-bg)"
              : props.state === "some"
                ? "var(--colors-blue-subtle-bg)"
                : undefined,
        }}
        onClick={props.onLock}
      >
        {props.state === "all" ? (
          <LockKeyhole size={14} />
        ) : props.state === "some" ? (
          <Lock size={14} />
        ) : (
          <LockOpen size={14} />
        )}
      </IconButton>
    </Tooltip>
  );
}
