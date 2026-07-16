
import { createSignal } from 'solid-js';
import { HStack } from 'styled-system/jsx';
import {
  DialogBasicDemoSection,
  DialogControlledDemoSection,
  DialogInitialFocusDemoSection,
  dialogPlacements,
  dialogSizes,
  type DialogDemoPlacement,
  type DialogDemoSize,
} from './dialog.demo.primary';
import {
  DialogAlertDemoSection,
  DialogNestedDemoSection,
  DialogNonModalDemoSection,
} from './dialog.demo.secondary';

export interface DialogDemoProps {
  variantProps?: Record<string, string>;
}

export const DialogDemo = (props: DialogDemoProps) => {
  const [isControlledOpen, setIsControlledOpen] = createSignal(false);
  const [selectedSize, setSelectedSize] = createSignal<DialogDemoSize>(dialogSizes[2]);
  const [selectedPlacement, setSelectedPlacement] = createSignal<DialogDemoPlacement>(dialogPlacements[1]);
  const baseVariantProps = () => {
    const source = props.variantProps ?? {};
    const { size: _size, placement: _placement, ...rest } = source;
    return rest;
  };

  return (
    <HStack alignItems="start" gap="6" flexWrap="wrap" width="full" maxW="6xl">
      <DialogBasicDemoSection
        baseVariantProps={baseVariantProps}
        selectedPlacement={selectedPlacement}
        selectedSize={selectedSize}
        setSelectedPlacement={setSelectedPlacement}
        setSelectedSize={setSelectedSize}
      />
      <DialogControlledDemoSection
        baseVariantProps={baseVariantProps}
        isControlledOpen={isControlledOpen}
        setIsControlledOpen={setIsControlledOpen}
      />
      <DialogInitialFocusDemoSection baseVariantProps={baseVariantProps} />
      <DialogAlertDemoSection baseVariantProps={baseVariantProps} />
      <DialogNestedDemoSection baseVariantProps={baseVariantProps} />
      <DialogNonModalDemoSection baseVariantProps={baseVariantProps} />
    </HStack>
  );
};
