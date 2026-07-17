import { useNavigate, useSearchParams } from "@solidjs/router";
import { ShieldCheck } from "lucide-solid";
import { For, Show, createResource, createSignal, onMount } from "solid-js";
import { z } from "zod";
import { Alert, Button, Card, Field, Input, Text } from "~/components/ui";
import { Box, HStack, VStack } from "styled-system/jsx";

const coachSchema = z.object({ id: z.string(), displayName: z.string() });
const coachesResponseSchema = z.object({ coaches: z.array(coachSchema) });
const loginResponseSchema = z.object({ error: z.string().optional() });

const responseErrorMessage = (status: number) =>
  status >= 500
    ? "Coach sign-in is temporarily unavailable. Check the server configuration and try again."
    : "The server returned an invalid response. Please try again.";

async function parseResponse<T>(response: Response, schema: z.ZodType<T>) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(responseErrorMessage(response.status));
  }

  const body = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error(responseErrorMessage(response.status));
  return parsed.data;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [coachId, setCoachId] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [coachLoadError, setCoachLoadError] = createSignal<string>();
  const [pending, setPending] = createSignal(false);
  const [ready, setReady] = createSignal(false);

  onMount(() => setReady(true));

  const [coaches] = createResource(ready, async (enabled) => {
    if (!enabled) return [];
    try {
      const response = await fetch("/api/auth/coaches");
      const body = await parseResponse(response, coachesResponseSchema);
      if (!response.ok) throw new Error("Coach sign-in is temporarily unavailable.");
      setCoachId(body.coaches[0]?.id ?? "");
      return body.coaches;
    } catch (loadError) {
      setCoachLoadError(
        loadError instanceof Error ? loadError.message : "Could not load the coach list.",
      );
      return [];
    }
  });

  const login = async () => {
    setPending(true);
    setError();
    try {
      const response = await fetch("/api/auth/coach-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ coachId: coachId(), password: password() }),
      });
      const body = await parseResponse(response, loginResponseSchema);
      if (!response.ok) {
        setError(body.error ?? "Sign in failed.");
        return;
      }
      const next = typeof params.next === "string" && params.next.startsWith("/")
        ? params.next
        : "/";
      navigate(next);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Box minH="dvh" bg="grass.subtle.bg" display="grid" placeItems="center" p="4">
      <Card.Root width="full" maxW="md" boxShadow="lg">
        <Card.Header>
          <VStack gap="3">
            <Box boxSize="14" borderRadius="l3" bg="grass.solid.bg" color="grass.solid.fg" display="grid" placeItems="center">
              <ShieldCheck size={30} />
            </Box>
            <Card.Title textStyle="3xl">Coach Companion</Card.Title>
            <Card.Description textAlign="center">Private match planning for Indy United U12</Card.Description>
          </VStack>
        </Card.Header>
        <Card.Body>
          <VStack alignItems="stretch" gap="5">
            <Show when={coachLoadError()}>
              {(message) => (
                <Alert.Root status="error">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>Sign-in unavailable</Alert.Title>
                    <Alert.Description>{message()}</Alert.Description>
                  </Alert.Content>
                </Alert.Root>
              )}
            </Show>
            <Field.Root required>
              <Field.Label>Coach</Field.Label>
              <HStack gap="2">
                <For each={coaches.latest ?? []}>
                  {(coach) => (
                    <Button flex="1" variant={coachId() === coach.id ? "solid" : "outline"} onClick={() => setCoachId(coach.id)}>
                      {coach.displayName}
                    </Button>
                  )}
                </For>
              </HStack>
            </Field.Root>
            <Field.Root required invalid={!!error()}>
              <Field.Label>Password</Field.Label>
              <Input
                type="password"
                value={password()}
                onInput={(event) => setPassword(event.currentTarget.value)}
                onKeyDown={(event) => event.key === "Enter" && login()}
                autocomplete="current-password"
              />
              <Show when={error()}>{(message) => <Field.ErrorText>{message()}</Field.ErrorText>}</Show>
            </Field.Root>
            <Button size="lg" loading={pending()} disabled={!coachId() || !password() || !!coachLoadError()} onClick={login}>
              Sign in
            </Button>
            <Box p="3" bg="bg.muted" borderRadius="l2">
              <Text textStyle="sm" color="fg.muted">Use the private password provided by your club administrator.</Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
