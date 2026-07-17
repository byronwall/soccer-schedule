import { A, useLocation, useNavigate } from "@solidjs/router";
import { CalendarDays, LayoutDashboard, LogOut, Settings, UserCog, Users } from "lucide-solid";
import { For, Show, type JSX } from "solid-js";
import { Alert, Button, Image, Spinner, Text } from "~/components/ui";
import { SoccerDataProvider, useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { Box, Flex, HStack, VStack } from "styled-system/jsx";

const links = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }, { href: "/games", label: "Games", icon: CalendarDays }, { href: "/roster", label: "Roster", icon: Users }, { href: "/settings/positions", label: "Positions", icon: Settings }];
export function AppShell(props: { children: JSX.Element }) {
  const data = useSoccerData();
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (href: string) => href === "/" ? location.pathname === href : location.pathname === href || location.pathname.startsWith(`${href}/`);
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); navigate("/login"); };
  return <Box minH="dvh" bg="bg.muted" color="fg.default">
    <Box as="header" bg="bg.default" borderBottomWidth="1px" borderColor="border" position="sticky" top="0" zIndex="10">
      <Flex maxW="7xl" mx="auto" px={{ base: "4", md: "6" }} minH="16" alignItems="center" justifyContent="space-between" gap="4">
        <A href="/" style={{ "text-decoration": "none", color: "inherit" }}>
          <HStack gap="3">
            <Image src="/coach-companion-logo.svg" alt="" boxSize="10" flexShrink="0" />
            <VStack alignItems="start" gap="0"><Box fontWeight="bold">{data.snapshot()?.teamDisplayName ?? "Coach Companion"}</Box><Text textStyle="xs" color="fg.muted">{data.snapshot()?.seasonName ?? "Loading team…"}</Text></VStack>
          </HStack>
        </A>
        <HStack gap="1" display={{ base: "none", md: "flex" }}><For each={links}>{(item) => <A href={item.href} style={{ "text-decoration": "none" }}><HStack gap="2" px="3" py="2" borderRadius="l2" color={isActive(item.href) ? "grass.solid.bg" : "fg.muted"} bg={isActive(item.href) ? "grass.subtle.bg" : "transparent"}><item.icon size={16}/><Box fontSize="sm" fontWeight="medium">{item.label}</Box></HStack></A>}</For><Show when={data.snapshot()?.coach.isSuperUser}><A href="/settings/users" style={{ "text-decoration": "none" }}><HStack gap="2" px="3" py="2" borderRadius="l2" color={isActive("/settings/users") ? "grass.solid.bg" : "fg.muted"} bg={isActive("/settings/users") ? "grass.subtle.bg" : "transparent"}><UserCog size={16}/><Box fontSize="sm" fontWeight="medium">Users</Box></HStack></A></Show></HStack>
        <HStack gap="3">
          <Text textStyle="sm" display={{ base: "none", sm: "block" }}>{data.snapshot()?.coach.displayName}</Text>
          <Show when={!import.meta.env.DEV}>
            <Button variant="plain" size="sm" onClick={logout}><LogOut size={16}/> <Box display={{ base: "none", sm: "block" }}>Sign out</Box></Button>
          </Show>
        </HStack>
      </Flex>
      <HStack display={{ base: "flex", md: "none" }} px="3" pb="2" justifyContent="space-around"><For each={links}>{(item) => <A href={item.href} style={{ "text-decoration": "none" }}><HStack gap="1" px="2" py="1" color={isActive(item.href) ? "grass.solid.bg" : "fg.muted"}><item.icon size={15}/><Box fontSize="xs">{item.label}</Box></HStack></A>}</For><Show when={data.snapshot()?.coach.isSuperUser}><A href="/settings/users" style={{ "text-decoration": "none" }}><HStack gap="1" px="2" py="1" color={isActive("/settings/users") ? "grass.solid.bg" : "fg.muted"}><UserCog size={15}/><Box fontSize="xs">Users</Box></HStack></A></Show></HStack>
    </Box>
    <Box as="main" maxW="7xl" mx="auto" px={{ base: "4", md: "6" }} py={{ base: "5", md: "8" }}>
      <Show when={data.error()}>{(message) => <Alert.Root status="error" mb="4"><Alert.Title>Something needs attention</Alert.Title><Alert.Description>{message()}</Alert.Description></Alert.Root>}</Show>
      <Show when={!data.loading()} fallback={<Flex minH="50vh" alignItems="center" justifyContent="center"><Spinner size="lg"/></Flex>}>{props.children}</Show>
    </Box>
  </Box>;
}

export function SoccerPage(props: { children: JSX.Element }) { return <SoccerDataProvider><AppShell>{props.children}</AppShell></SoccerDataProvider>; }
