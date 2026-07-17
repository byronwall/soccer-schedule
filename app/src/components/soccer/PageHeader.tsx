import type { JSX } from "solid-js";
import { Heading, Text } from "~/components/ui";
import { Flex, VStack } from "styled-system/jsx";
export function PageHeader(props: { eyebrow?: string; title: string; description: string; actions?: JSX.Element }) {
  return <Flex justifyContent="space-between" alignItems={{ base: "start", md: "end" }} flexDirection={{ base: "column", md: "row" }} gap="4" mb="6"><VStack alignItems="start" gap="1"><Text textStyle="sm" color="grass.solid.bg" fontWeight="semibold">{props.eyebrow}</Text><Heading as="h1" textStyle={{ base: "3xl", md: "4xl" }}>{props.title}</Heading><Text color="fg.muted" maxW="2xl">{props.description}</Text></VStack>{props.actions}</Flex>;
}
