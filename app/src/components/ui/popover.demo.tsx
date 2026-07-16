
import { createSignal } from 'solid-js';
import { HStack } from 'styled-system/jsx';
import { PopoverPrimaryDemoSections } from './popover.demo.primary';
import { PopoverSecondaryDemoSections } from './popover.demo.secondary';

export interface PopoverDemoProps {
  variantProps?: Record<string, string>;
}

export const PopoverDemo = (props: PopoverDemoProps) => {
  const [isControlledOpen, setIsControlledOpen] = createSignal(false);

  return (
    <HStack alignItems="start" gap="6" flexWrap="wrap" width="full" maxW="6xl">
      <PopoverPrimaryDemoSections
        isControlledOpen={isControlledOpen}
        setIsControlledOpen={setIsControlledOpen}
        variantProps={props.variantProps}
      />
      <PopoverSecondaryDemoSections variantProps={props.variantProps} />
    </HStack>
  );
};
