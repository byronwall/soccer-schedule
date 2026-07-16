
import { Portal } from 'solid-js/web';
import { Box, VStack } from 'styled-system/jsx';
import { Button as DemoButton } from './button';
import { CloseButton } from './close-button';
import * as Dialog from './dialog';
import * as Field from './field';
import { Input } from './input';
import { Textarea } from './textarea';
import { Arrow, Body, CloseTrigger, Content, Description, Footer, Header, Positioner, Root, Title, Trigger } from './popover';
import { PopoverBasePanelContent } from './popover.demo.content';

type PopoverVariantProps = Record<string, string>;

export const PopoverSecondaryDemoSections = (props: { variantProps?: PopoverVariantProps }) => {
  let initialFocusTextarea: HTMLTextAreaElement | undefined;
  const variantProps = () => props.variantProps ?? {};
  return (
    <>
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Nested</Box>
        <Box textStyle="xs" color="fg.muted">
          Demonstrates a popover opened from inside another popover.
        </Box>
        <Root {...variantProps()}>
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
                <Arrow />
                <Body>
                  <Title>Title</Title>
                  <Description>Description</Description>
                </Body>
                <Footer>
                  <Root>
                    <Trigger
                      asChild={(triggerProps) => (
                        <DemoButton
                          variant="outline"
                          size="sm"
                          style={{ width: "auto" }}
                          {...triggerProps()}
                        >
                          Open Nested Popover
                        </DemoButton>
                      )}
                    />
                    <Positioner>
                      <Content>
                        <Arrow />
                        <Body>
                          <Title>Title</Title>
                          <Description>Description</Description>
                        </Body>
                      </Content>
                    </Positioner>
                  </Root>
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => <CloseButton {...triggerProps()} />}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Form</Box>
        <Box textStyle="xs" color="fg.muted">
          Shows form fields and footer actions rendered inside popover content.
        </Box>
        <Root {...variantProps()}>
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
                <Arrow />
                <Header>
                  <Title>Report an issue</Title>
                  <Description>Please fill out the form below.</Description>
                </Header>
                <Body gap="4">
                  <Field.Root>
                    <Field.Label>Title</Field.Label>
                    <Input placeholder="A descriptive title" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Description</Field.Label>
                    <Textarea placeholder="Describe the issue" />
                  </Field.Root>
                </Body>
                <Footer>
                  <DemoButton width="full">Save</DemoButton>
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => <CloseButton {...triggerProps()} />}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Initial Focus</Box>
        <Box textStyle="xs" color="fg.muted">
          Sets `initialFocusEl` so focus lands on the textarea when opened.
        </Box>
        <Root
          {...variantProps()}
          initialFocusEl={() => initialFocusTextarea ?? null}
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
                <Arrow />
                <Header>
                  <Title>Report an issue</Title>
                  <Description>Please fill out the form below.</Description>
                </Header>
                <Body gap="4">
                  <Field.Root>
                    <Field.Label>Title</Field.Label>
                    <Input placeholder="A descriptive title" />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Description</Field.Label>
                    <Textarea
                      ref={initialFocusTextarea}
                      placeholder="Describe the issue"
                    />
                  </Field.Root>
                </Body>
                <Footer>
                  <DemoButton width="full">Save</DemoButton>
                </Footer>
                <CloseTrigger
                  asChild={(triggerProps) => <CloseButton {...triggerProps()} />}
                />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Custom Background</Box>
        <Box textStyle="xs" color="fg.muted">
          Applies `--popover-bg` to customize content and arrow background.
        </Box>
        <Root {...variantProps()}>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Popover
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner>
              <Content style={{ "--popover-bg": "lightblue" }}>
                <PopoverBasePanelContent />
              </Content>
            </Positioner>
          </Portal>
        </Root>
      </VStack>

      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">Within Dialog</Box>
        <Box textStyle="xs" color="fg.muted">
          Uses popover inside dialog with fixed strategy and detached hiding.
        </Box>
        <Dialog.Root scrollBehavior="inside">
          <Dialog.Trigger
            asChild={(triggerProps) => (
              <DemoButton variant="outline" style={{ width: "auto" }} {...triggerProps()}>
                Open Dialog
              </DemoButton>
            )}
          />
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.CloseTrigger
                  asChild={(triggerProps) => <CloseButton {...triggerProps()} />}
                />
                <Dialog.Header>
                  <Dialog.Title>Popover in Dialog</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  This popover is inside a dialog. Open the popover from the footer.
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton variant="outline" {...triggerProps()}>
                        Close
                      </DemoButton>
                    )}
                  />
                  <Root
                    positioning={{ strategy: "fixed", hideWhenDetached: true }}
                  >
                    <Trigger
                      asChild={(triggerProps) => (
                        <DemoButton style={{ width: "auto" }} {...triggerProps()}>
                          Open Popover
                        </DemoButton>
                      )}
                    />
                    <Positioner>
                      <Content><PopoverBasePanelContent /></Content>
                    </Positioner>
                  </Root>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </VStack>
    </>
  );
};
