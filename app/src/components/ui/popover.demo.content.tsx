
import { Arrow, Body, CloseTrigger, Description, Title } from './popover';
import { CloseButton } from './close-button';

export const PopoverBasePanelContent = () => (
  <>
    <Arrow />
    <Body>
      <Title>Title</Title>
      <Description>Description</Description>
    </Body>
    <CloseTrigger asChild={(triggerProps) => <CloseButton {...triggerProps()} />} />
  </>
);
