import BibliotecaClient from "@/components/BibliotecaClient";
import { getGames } from "@/lib/games";

export default async function Biblioteca() {
  const games = await getGames();

  return <BibliotecaClient games={games} />;
}
