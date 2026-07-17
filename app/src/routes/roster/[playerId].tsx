import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { PlayerDetailsPage } from "~/components/soccer/PlayerDetailsPage";

export default function PlayerDetailsRoute() {
  return <SoccerPage><Title>Player · Coach Companion</Title><PlayerDetailsPage /></SoccerPage>;
}
