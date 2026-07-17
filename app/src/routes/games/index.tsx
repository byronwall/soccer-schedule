import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { GamesPage } from "~/components/soccer/GamesPage";

export default function GamesRoute() {
  return <SoccerPage><Title>Games · Coach Companion</Title><GamesPage /></SoccerPage>;
}
