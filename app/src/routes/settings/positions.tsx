import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { PositionSettingsPage } from "~/components/soccer/PositionSettingsPage";

export default function PositionSettingsRoute() {
  return (
    <SoccerPage>
      <Title>Positions · Coach Companion</Title>
      <PositionSettingsPage />
    </SoccerPage>
  );
}
