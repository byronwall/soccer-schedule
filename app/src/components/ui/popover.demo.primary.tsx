
import { type Accessor, type Setter } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Box, VStack } from 'styled-system/jsx';
import { Button as DemoButton } from './button';
import { CloseButton } from './close-button';
import { Body, CloseTrigger, Content, Description, Positioner, Root, Title, Trigger } from './popover';
import { PopoverBasePanelContent } from './popover.demo.content';

type PopoverVariantProps = Record<string, string>;

export const PopoverPrimaryDemoSections = (props: { isControlledOpen: Accessor<boolean>; setIsControlledOpen: Setter<boolean>; variantProps?: PopoverVariantProps }) => {
  const variantProps = () => props.variantProps ?? {};
  return (
  <>
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Basic</Box>
        <Box textStyle="xs" color="fg.muted">
          Default popover with title, description, arrow, and close trigger.
        </Box>
        <Root {...variantProps()}>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content><PopoverBasePanelContent /></Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Controlled</Box>
        <Box textStyle="xs" color="fg.muted">
          Uses `open` and `onOpenChange` to manage visibility state.
        </Box>
        <Root
          {...variantProps()}
          open={props.isControlledOpen()}
          onOpenChange={(event) => props.setIsControlledOpen(event.open)}
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content><PopoverBasePanelContent /></Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Lazy Mount</Box>
        <Box textStyle="xs" color="fg.muted">
          Content mounts only when opened (`lazyMount` + `unmountOnExit`).
        </Box>
        <Root {...variantProps()} lazyMount unmountOnExit>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content><PopoverBasePanelContent /></Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Placement</Box>
        <Box textStyle="xs" color="fg.muted">
          Sets `positioning.placement` to render the popover on the right.
        </Box>
        <Root {...variantProps()} positioning={{ placement: "right" }}>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content><PopoverBasePanelContent /></Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Offset</Box>
        <Box textStyle="xs" color="fg.muted">
          Uses explicit `positioning.offset` values for placement fine-tuning.
        </Box>
        <Root
          {...variantProps()}
          positioning={{ offset: { crossAxis: 0, mainAxis: 0 } }}
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content>
                <Body>
                  <Title>Title</Title>
                  <Description>Description</Description>
                </Body>
                <CloseTrigger
                  asChild={(triggerProps) => <CloseButton {...triggerProps()} />}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Same Width</Box>
        <Box textStyle="xs" color="fg.muted">
          Uses `positioning.sameWidth` so panel width matches the trigger width.
        </Box>
        <Root {...variantProps()} positioning={{ sameWidth: true }}>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton
                variant="outline"
                minW="12rem"
                style={{ width: "auto" }}
                {...triggerProps()}
              >
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content width="auto"><PopoverBasePanelContent /></Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>
  </>
  );
};
