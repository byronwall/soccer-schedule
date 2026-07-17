import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { UserSettingsPage } from "~/components/soccer/UserSettingsPage";

export default function UserSettingsRoute() {
  return (
    <SoccerPage>
      <Title>Users · Coach Companion</Title>
      <UserSettingsPage />
    </SoccerPage>
  );
}
