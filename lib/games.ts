import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games-types";

export type { GameCategory, GameColor, Game } from "@/lib/games-types";
export { CATS } from "@/lib/games-types";

async function withRealBest(games: Game[]): Promise<Game[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", "asteroides")
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return games;

  return games.map((game) =>
    game.id === "asteroides" ? { ...game, best: data.score } : game,
  );
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("*");

  if (error || !data) return [];

  return withRealBest(data as Game[]);
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  if (data.id === "asteroides") {
    const [withBest] = await withRealBest([data as Game]);
    return withBest;
  }

  return data as Game;
}
