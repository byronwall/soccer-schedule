import { useNavigate, useSearchParams } from "@solidjs/router";
import { ShieldCheck } from "lucide-solid";
import { Show, createSignal } from "solid-js";
import { z } from "zod";
import { Alert, Button, Card, Field, Input, Text } from "~/components/ui";
import { Box, VStack } from "styled-system/jsx";

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
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal<string>();
  const [pending, setPending] = createSignal(false);

  const login = async () => {
    setPending(true);
    setError();
    try {
      const response = await fetch("/api/auth/coach-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: username(), password: password() }),
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
            <Show when={error()?.includes("temporarily unavailable")}>
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Sign-in unavailable</Alert.Title>
                  <Alert.Description>{error()}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            </Show>
            <Field.Root required>
              <Field.Label>Username</Field.Label>
              <Input
                value={username()}
                onInput={(event) => setUsername(event.currentTarget.value)}
                autocomplete="username"
                autofocus
              />
            </Field.Root>
            <Field.Root required invalid={!!error() && !error()?.includes("temporarily unavailable")}>
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
            <Button size="lg" loading={pending()} disabled={!username().trim() || !password()} onClick={login}>
              Sign in
            </Button>
            <Box p="3" bg="bg.muted" borderRadius="l2">
              <Text textStyle="sm" color="fg.muted">Use the username and private password provided by your administrator.</Text>
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
