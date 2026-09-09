import { notFound } from "next/navigation";
import { getGame } from "@/lib/games";
import FroggerPlayer from "@/components/games/FroggerPlayer";

export default async function FroggerPlayPage() {
  const game = await getGame("frogger");
  if (!game) notFound();

  return <FroggerPlayer game={game} />;
}
