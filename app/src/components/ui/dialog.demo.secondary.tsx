
import { Portal } from 'solid-js/web';
import { Box, VStack } from 'styled-system/jsx';
import { Button as DemoButton } from './button';
import { CloseButton } from './close-button';
import { ActionTrigger, Backdrop, CloseTrigger, Content, Description, Footer, Header, Positioner, Root, Title, Trigger } from './dialog';

type DialogVariantProps = Record<string, string>;

export const DialogAlertDemoSection = (props: { baseVariantProps: () => DialogVariantProps }) => {
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Alert Dialog
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Uses `role=&quot;alertdialog&quot;` for destructive confirmations.
        </Box>
        <Root {...props.baseVariantProps()} role="alertdialog">
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
                  <Title>Are you sure?</Title>
                  <Description>
                    This action cannot be undone and will permanently remove
                    data.
                  </Description>
                </Header>
                <Footer>
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton
                        colorPalette="gray"
                        variant="outline"
                        {...triggerProps()}
                      >
                        Cancel
                      </DemoButton>
                    )}
                  />
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton colorPalette="red" {...triggerProps()}>
                        Delete
                      </DemoButton>
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

export const DialogNestedDemoSection = (props: { baseVariantProps: () => DialogVariantProps }) => {
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Nested
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Opens a secondary dialog from inside a primary dialog.
        </Box>
        <Root {...props.baseVariantProps()}>
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton
                variant="outline"
                style={{ width: "auto" }}
                {...triggerProps()}
              >
                Open Parent
              </DemoButton>
            )}
          />
          <Portal>
            <Backdrop />
            <Positioner>
              <Content>
                <Header>
                  <Title>Parent Dialog</Title>
                  <Description>
                    Open a nested dialog from the footer action.
                  </Description>
                </Header>
                <Footer>
                  <Root size="sm">
                    <Trigger
                      asChild={(triggerProps) => (
                        <DemoButton
                          style={{ width: "auto" }}
                          {...triggerProps()}
                        >
                          Open Nested
                        </DemoButton>
                      )}
                    />
                    <Portal>
                      <Backdrop />
                      <Positioner>
                        <Content>
                          <Header>
                            <Title>Nested Dialog</Title>
                            <Description>
                              Secondary modal in the same flow.
                            </Description>
                          </Header>
                          <CloseTrigger
                            asChild={(triggerProps) => (
                              <CloseButton {...triggerProps()} />
                            )}
                          />
                        </Content>
                      </Positioner>
                    </Portal>
                  </Root>
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

export const DialogNonModalDemoSection = (props: { baseVariantProps: () => DialogVariantProps }) => {
  return (
      <VStack as="section" alignItems="start" gap="2" minW="72" flex="1">
        <Box as="h3" fontWeight="semibold">
          Non-Modal
        </Box>
        <Box textStyle="xs" color="fg.muted">
          Demonstrates non-modal behavior with outside interaction enabled.
        </Box>
        <Root
          {...props.baseVariantProps()}
          modal={false}
          closeOnInteractOutside={false}
        >
          <Trigger
            asChild={(triggerProps) => (
              <DemoButton
                variant="outline"
                style={{ width: "auto" }}
                {...triggerProps()}
              >
                Open Non-Modal
              </DemoButton>
            )}
          />
          <Portal>
            <Positioner pointerEvents="none">
              <Content>
                <Header>
                  <Title>Non-Modal Dialog</Title>
                  <Description>
                    Background remains interactive while open.
                  </Description>
                </Header>
                <Footer>
                  <ActionTrigger
                    asChild={(triggerProps) => (
                      <DemoButton variant="outline" {...triggerProps()}>
                        Close
                      </DemoButton>
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
