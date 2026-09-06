/**
 * Halo arrives once per visit to the app, not once per screen that shows it.
 *
 * The welcome and Home both stage the arrival, and a child who has just
 * watched Halo descend into the welcome should not watch it descend again
 * three seconds later on Home. So the claim is shared: the first surface to
 * ask gets the entrance, and every surface after it simply finds Halo
 * already there.
 *
 * A module-level flag is exactly the right memory for this. It lasts as long
 * as the tab and resets on a genuine reload, and it is not storage — nothing
 * about this child is written down anywhere, which is the promise this
 * product makes.
 */
let claimed = false;

/** True for the first caller after a page load, false for every other. */
export function claimArrival(): boolean {
  if (claimed) return false;
  claimed = true;
  return true;
}

/** Whether the entrance has been taken, without taking it. */
export function arrivalTaken(): boolean {
  return claimed;
}
