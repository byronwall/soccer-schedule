import { Trash2, UserPlus } from "lucide-solid";
import { For, Show, createResource, createSignal, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { z } from "zod";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Text,
} from "~/components/ui";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  createdAt: z.string().nullable(),
  isSuperUser: z.boolean(),
});
const usersResponseSchema = z.object({ users: z.array(userSchema) });
const errorResponseSchema = z.object({ error: z.string().optional() });

async function parseJson<T>(response: Response, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw new Error("The server returned an invalid response.");
  return parsed.data;
}

export function UserSettingsPage() {
  const [ready, setReady] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string>();
  const [deleteTarget, setDeleteTarget] = createSignal<z.infer<typeof userSchema>>();
  const [draft, setDraft] = createStore({ username: "", displayName: "", password: "" });

  onMount(() => setReady(true));
  const [users, { refetch }] = createResource(ready, async (enabled) => {
    if (!enabled) return [];
    const response = await fetch("/api/auth/users");
    if (!response.ok) {
      const body = await parseJson(response, errorResponseSchema);
      throw new Error(body.error ?? "Could not load users.");
    }
    const body = await parseJson(response, usersResponseSchema);
    return body.users;
  });

  const createUser = async () => {
    setPending(true);
    setError();
    try {
      const response = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const body = await parseJson(response, errorResponseSchema);
        throw new Error(body.error ?? "Could not create user.");
      }
      setDraft({ username: "", displayName: "", password: "" });
      await refetch();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create user.");
    } finally {
      setPending(false);
    }
  };

  const deleteUser = async () => {
    const target = deleteTarget();
    if (!target) return;
    setError();
    try {
      const response = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: target.id }),
      });
      if (!response.ok) {
        const body = await parseJson(response, errorResponseSchema);
        throw new Error(body.error ?? "Could not delete user.");
      }
      await refetch();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete user.");
    } finally {
      setDeleteTarget();
    }
  };

  const valid = () =>
    draft.username.trim().length > 0
    && draft.displayName.trim().length > 0
    && draft.password.length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Access settings"
        title="Users"
        description="Create private sign-ins for people who need access. Passwords are salted and hashed before they are stored."
      />
      <Show when={error()}>
        {(message) => (
          <Alert.Root status="error" mb="4">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>User update failed</Alert.Title>
              <Alert.Description>{message()}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
      </Show>
      <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) minmax(20rem, 26rem)" }} gap="6" alignItems="start">
        <Card.Root>
          <Card.Header>
            <Card.Title>People with access</Card.Title>
            <Card.Description>The master user is configured by the server and cannot be removed here.</Card.Description>
          </Card.Header>
          <Card.Body>
            <VStack alignItems="stretch" gap="3">
              <For each={users.latest ?? []}>
                {(user) => (
                  <HStack justifyContent="space-between" gap="4" p="3" borderWidth="1px" borderColor="border" borderRadius="l2">
                    <Box minW="0">
                      <HStack gap="2">
                        <Text fontWeight="semibold">{user.displayName}</Text>
                        <Show when={user.isSuperUser}><Badge colorPalette="grass">Super user</Badge></Show>
                      </HStack>
                      <Text textStyle="sm" color="fg.muted">@{user.username}</Text>
                    </Box>
                    <Show when={!user.isSuperUser}>
                      <Button variant="plain" size="sm" onClick={() => setDeleteTarget(user)}>
                        <Trash2 size={16} /> Remove
                      </Button>
                    </Show>
                  </HStack>
                )}
              </For>
              <Show when={!users.loading && (users.latest?.length ?? 0) === 0}>
                <Text color="fg.muted">No users found.</Text>
              </Show>
            </VStack>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Card.Title>Add a user</Card.Title>
            <Card.Description>Choose any non-empty password.</Card.Description>
          </Card.Header>
          <Card.Body>
            <VStack alignItems="stretch" gap="4">
              <Field.Root required>
                <Field.Label>Username</Field.Label>
                <Input
                  value={draft.username}
                  autocomplete="off"
                  onInput={(event) => setDraft("username", event.currentTarget.value)}
                />
                <Field.HelperText>Letters, numbers, periods, underscores, and hyphens.</Field.HelperText>
              </Field.Root>
              <Field.Root required>
                <Field.Label>Display name</Field.Label>
                <Input
                  value={draft.displayName}
                  autocomplete="off"
                  onInput={(event) => setDraft("displayName", event.currentTarget.value)}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Temporary password</Field.Label>
                <Input
                  type="password"
                  value={draft.password}
                  autocomplete="new-password"
                  onInput={(event) => setDraft("password", event.currentTarget.value)}
                  onKeyDown={(event) => event.key === "Enter" && valid() && void createUser()}
                />
              </Field.Root>
              <Button loading={pending()} disabled={!valid()} onClick={() => void createUser()}>
                <UserPlus size={16} /> Create user
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
      <ConfirmDialog
        open={!!deleteTarget()}
        onOpenChange={(open) => !open && setDeleteTarget()}
        title="Remove user?"
        description={`Remove ${deleteTarget()?.displayName ?? "this user"} and revoke their active sessions?`}
        confirmLabel="Remove user"
        onConfirm={() => void deleteUser()}
      />
    </>
  );
}
