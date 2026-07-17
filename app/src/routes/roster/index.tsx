import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { RosterPage } from "~/components/soccer/RosterPage";

export default function RosterRoute() {
  return <SoccerPage><Title>Roster · Coach Companion</Title><RosterPage /></SoccerPage>;
}
