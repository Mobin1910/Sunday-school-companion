import GlobalScreen from "@/components/nav/GlobalScreen";
import PracticeScreen from "@/components/play/PracticeScreen";
import { getChapters } from "@/content";
import { gamePool } from "@/content/pools";
import { canPlay } from "@/interactions/registry";


/**
 * Games — cross-chapter quick play.
 *
 * A child can arrive here and be playing in one tap, without choosing a
 * chapter first. The questions are the chapters' own interactions, drawn
 * from the existing content pipeline; nothing is authored twice.
 *
 * Two filters, and they are different questions:
 *
 *   eligibleForPlay — *should* this be in a shuffled pool? Content's
 *                     business, and it excludes Discovery, which has no
 *                     wrong answer to streak on.
 *   canPlay         — *can* this be rendered yet? The registry's business,
 *                     and it shrinks as Milestones 5–7 land.
 *
 * The pool is built here, on the server, so the whole content layer stays
 * out of the browser bundle.
 */
export default function GamesPage() {
  const pool = gamePool(getChapters()).filter((question) =>
    canPlay(question.interaction),
  );

  return (
    <GlobalScreen active="games">
      <PracticeScreen
        pool={pool}
        streak="games"
        title="Games"
        blurb="Let's see what we remember together."
        startLabel="Start game"
        note="Questions from every story you have, shuffled."
        empty={{
          title: "No games yet.",
          blurb: "They arrive with the stories.",
        }}
      />
    </GlobalScreen>
  );
}
