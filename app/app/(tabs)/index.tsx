import { MateHomeScreen } from "../../src/features/mate-home";
import { TravelerHome } from "../../src/features/map-browse/TravelerHome";
import { useRole } from "../../src/state";
export default function Home() {
  const { role } = useRole();
  return role === "mate" ? <MateHomeScreen /> : <TravelerHome />;
}
