import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/games-types";
import { gameEngines } from "@/lib/games/registry";

export type { GameCategory, GameColor, Game } from "@/lib/games-types";
export { CATS } from "@/lib/games-types";

async function bestFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gameId: string,
) {
  const { data } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.score;
}

async function withRealBest(games: Game[]): Promise<Game[]> {
  const supabase = await createClient();
  const realGames = games.filter((game) => game.id in gameEngines);

  if (realGames.length === 0) return games;

  const bests = await Promise.all(
    realGames.map((game) => bestFor(supabase, game.id)),
  );
  const bestById = new Map(realGames.map((game, i) => [game.id, bests[i]]));

  return games.map((game) => {
    const best = bestById.get(game.id);
    return best === undefined ? game : { ...game, best };
  });
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

  if (data.id in gameEngines) {
    const [withBest] = await withRealBest([data as Game]);
    return withBest;
  }

  return data as Game;
}
