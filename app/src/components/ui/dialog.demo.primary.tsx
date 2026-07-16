
import { For, type Accessor, type Setter } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Box, HStack, VStack } from 'styled-system/jsx';
import { Button as DemoButton } from './button';
import { CloseButton } from './close-button';
import { ActionTrigger, Backdrop, Body, CloseTrigger, Content, Description, Footer, Header, Positioner, Root, Title, Trigger } from './dialog';
import * as Field from './field';
import { Input } from './input';

export const dialogSizes = ['xs', 'sm', 'md', 'lg', 'xl', 'full'] as const;
export const dialogPlacements = ['top', 'center', 'bottom'] as const;
export type DialogDemoSize = (typeof dialogSizes)[number];
export type DialogDemoPlacement = (typeof dialogPlacements)[number];
type DialogVariantProps = Record<string, string>;

export const DialogBasicDemoSection = (props: { baseVariantProps: () => DialogVariantProps; selectedPlacement: Accessor<DialogDemoPlacement>; selectedSize: Accessor<DialogDemoSize>; setSelectedPlacement: Setter<DialogDemoPlacement>; setSelectedSize: Setter<DialogDemoSize> }) => {
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Basic
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Choose size and placement, then open the dialog with that config.
        </Box>
        <HStack gap="1" flexWrap="wrap">
          <For each={dialogSizes}>
            {(size) => (
              <DemoButton
                size="2xs"
                variant={props.selectedSize() === size ? "solid" : "outline"}
                onClick={() => props.setSelectedSize(size)}
              >
                {size}
              </DemoButton>
            )}
          </For>
        </HStack>
        <HStack gap="1" flexWrap="wrap">
          <For each={dialogPlacements}>
            {(placement) => (
              <DemoButton
                size="2xs"
                variant={props.selectedPlacement() === placement ? "solid" : "outline"}
                onClick={() => props.setSelectedPlacement(placement)}
              >
                {placement}
              </DemoButton>
            )}
          </For>
        </HStack>
        <Root
          {...props.baseVariantProps()}
          size={props.selectedSize()}
          placement={props.selectedPlacement()}
          unmountOnExit
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton style={{ width: "auto" }} {...triggerProps()}>
                Open {props.selectedSize()} / {props.selectedPlacement()}
              </DemoButton>
            )}
          />
          <Portal>
            <Backdrop />
            <Positioner>
              <Content>
                <Header>
                  <Title>Title</Title>
                  <Description>
                    Size: {props.selectedSize()} | Placement: {props.selectedPlacement()}
                  </Description>
                </Header>
                <Body minH="24" gap="3">
                  <Box textStyle="xs" color="fg.muted">
                    In-dialog controls
                  </Box>
                  <HStack gap="1" flexWrap="wrap">
                    <For each={dialogSizes}>
                      {(size) => (
                        <DemoButton
                          size="2xs"
                          variant={props.selectedSize() === size ? "solid" : "outline"}
                          onClick={() => props.setSelectedSize(size)}
                        >
                          {size}
                        </DemoButton>
                      )}
                    </For>
                  </HStack>
                  <HStack gap="1" flexWrap="wrap">
                    <For each={dialogPlacements}>
                      {(placement) => (
                        <DemoButton
                          size="2xs"
                          variant={
                            props.selectedPlacement() === placement ? "solid" : "outline"
                          }
                          onClick={() => props.setSelectedPlacement(placement)}
                        >
                          {placement}
                        </DemoButton>
                      )}
                    </For>
                  </HStack>
                  <Box>Dialog body content.</Box>
                </Body>
                <Footer>
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton variant="outline" {...triggerProps()}>
                        Cancel
                      </DemoButton>
                    )}
                  />
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton {...triggerProps()}>Save</DemoButton>
                    )}
                  />
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => (
                    <CloseButton {...triggerProps()} />
                  )}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>
  );
};

export const DialogControlledDemoSection = (props: { baseVariantProps: () => DialogVariantProps; isControlledOpen: Accessor<boolean>; setIsControlledOpen: Setter<boolean> }) => {
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Controlled
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Uses `open` and `onOpenChange` to control dialog visibility.
        </Box>
        <Root
          {...props.baseVariantProps()}
          open={props.isControlledOpen()}
          onOpenChange={(event) => props.setIsControlledOpen(event.open)}
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton
                variant="outline"
                style={{ width: "auto" }}
                {...triggerProps()}
              >
                Open Dialog
              </DemoButton>
            )}
          />
          <Portal>
            <Backdrop />
            <Positioner>
              <Content>
                <Header>
                  <Title>Controlled Dialog</Title>
                  <Description>
                    State is managed externally by the demo.
                  </Description>
                </Header>
                <Body>Close from any action to update controlled state.</Body>
                <Footer>
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton variant="outline" {...triggerProps()}>
                        Cancel
                      </DemoButton>
                    )}
                  />
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton {...triggerProps()}>Confirm</DemoButton>
                    )}
                  />
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => (
                    <CloseButton {...triggerProps()} />
                  )}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>
  );
};

export const DialogInitialFocusDemoSection = (props: { baseVariantProps: () => DialogVariantProps }) => {
  let initialFocusInput: HTMLInputElement | undefined;
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Initial Focus
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Focus moves to a target field on open via `initialFocusEl`.
        </Box>
        <Root
          {...props.baseVariantProps()}
          initialFocusEl={() => initialFocusInput ?? null}
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton
                variant="outline"
                style={{ width: "auto" }}
                {...triggerProps()}
              >
                Open Dialog
              </DemoButton>
            )}
          />
          <Portal>
            <Backdrop />
            <Positioner>
              <Content>
                <Header>
                  <Title>Profile</Title>
                  <Description>Focus should land on last name.</Description>
                </Header>
                <Body gap="4">
                  <Field.Root>
                    <Field.Label>First Name</Field.Label>
                    <Input placeholder="First Name" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Last Name</Field.Label>
                    <Input ref={initialFocusInput} placeholder="Last Name" />
                  </Field.Root>
                </Body>
                <Footer>
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton variant="outline" {...triggerProps()}>
                        Cancel
                      </DemoButton>
                    )}
                  />
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton {...triggerProps()}>Save</DemoButton>
                    )}
                  />
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => (
                    <CloseButton {...triggerProps()} />
                  )}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>
  );
};
