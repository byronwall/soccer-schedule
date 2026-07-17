import { Title } from "@solidjs/meta";
import { SoccerPage } from "~/components/soccer/AppShell";
import { NewGamePage } from "~/components/soccer/GamePages";
export default function NewGameRoute() { return <SoccerPage><Title>New game · Coach Companion</Title><NewGamePage/></SoccerPage>; }
