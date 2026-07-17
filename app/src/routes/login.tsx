import { Navigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { Show } from "solid-js";
import { LoginPage } from "~/components/soccer/LoginPage";

export default function LoginRoute() {
  return (
    <Show
      when={import.meta.env.DEV}
      fallback={<><Title>Sign in · Coach Companion</Title><LoginPage /></>}
    >
      <Navigate href="/" />
    </Show>
  );
}
