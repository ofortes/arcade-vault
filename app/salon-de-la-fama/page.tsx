import HallOfFameClient, { type ScoreRow } from "@/components/HallOfFameClient";
import { getGames } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export default async function HallOfFamePage() {
  const games = await getGames();
  const supabase = await createClient();

  const scoresByGame: Record<string, ScoreRow[]> = {};
  await Promise.all(
    games.map(async (g) => {
      const { data } = await supabase
        .from("scores")
        .select("name, score, created_at")
        .eq("game_id", g.id)
        .order("score", { ascending: false })
        .limit(12);
      scoresByGame[g.id] = data ?? [];
    }),
  );

  return <HallOfFameClient games={games} scoresByGame={scoresByGame} />;
}
