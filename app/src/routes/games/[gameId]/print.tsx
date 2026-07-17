import { PrintPage } from "~/components/soccer/PrintPage";
import { SoccerDataProvider } from "~/features/soccer/SoccerDataProvider";
export default function PrintRoute() { return <SoccerDataProvider><PrintPage/></SoccerDataProvider>; }
