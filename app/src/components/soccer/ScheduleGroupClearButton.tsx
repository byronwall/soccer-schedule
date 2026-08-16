import { Trash2 } from "lucide-solid";
import { IconButton, Tooltip } from "~/components/ui";

type ScheduleGroupClearButtonProps = {
  label: string;
  disabled?: boolean;
  onClear: () => void;
};

export function ScheduleGroupClearButton(props: ScheduleGroupClearButtonProps) {
  const actionLabel = () => `Clear all ${props.label}`;

  return (
    <Tooltip
      content={actionLabel()}
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
        aria-label={actionLabel()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          props.onClear();
        }}
      >
        <Trash2 size={14} />
      </IconButton>
    </Tooltip>
  );
}
