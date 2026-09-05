/**
 * Job — the companion.
 *
 * Deliberately a no-op today. Job's behaviour is being designed separately,
 * and a half-invented blob shipped early would be harder to replace than an
 * empty slot.
 *
 * What this file is for is the *placement*: every surface Job is meant to
 * appear on already calls this, so giving him a body later is a change to
 * one file rather than a hunt across the app. The `where` prop is the
 * moment he is being asked to show up for, because his behaviour differs by
 * moment — he is warm on a hub, helpful in practice, quiet in celebration.
 *
 * He is called from the Chapter Hub, the practice and memory-verse screens,
 * and the reader's first-time guidance. He is deliberately NOT called from
 * inside story artwork: the story is not his.
 */

export type JobMoment =
  | "hub"
  | "practice"
  | "verse"
  | "guidance"
  | "recovery"
  | "celebration";

export default function Job({ where }: { where: JobMoment }) {
  void where;
  return null;
}
