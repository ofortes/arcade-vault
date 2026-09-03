import HomeLanding from "@/components/HomeLanding";
import { getGames } from "@/lib/games";

export default async function Home() {
  const games = await getGames();

  return <HomeLanding games={games} />;
}
