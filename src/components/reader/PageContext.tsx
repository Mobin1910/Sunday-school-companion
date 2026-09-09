"use client";

import { createContext, useContext } from "react";

/**
 * What a card can learn about the page it is sitting on.
 *
 * The reader knows two things no card can work out for itself: whether this
 * is the page the child has actually turned to, and how to ask for the page
 * to be turned. Both have to travel from the reader down to a question that
 * may be several components deep.
 *
 * They travel by context rather than by props, and that is not a style
 * choice. The pages are built by a server component and handed to the reader
 * as children, so by the time the reader has them they are rendered output
 * rather than elements it can re-invoke — cloning them to add a prop puts
 * the prop on whatever host element happens to be at the root, where nothing
 * is listening. Context crosses that boundary because the provider and the
 * consumer are both on the client; what the server built in between simply
 * passes through.
 *
 * The default is what a card gets anywhere that is not a reader — a chapter's
 * games, the shuffled pool — where there is no page and nothing to turn.
 */
export type PageState = {
  /** Already turned to, as opposed to mounted underneath waiting to be. */
  active: boolean;
  /** Ask the reader to move on. Absent where nothing follows. */
  onSolved?: () => void;
};

const PageContext = createContext<PageState>({ active: true });

export const PageProvider = PageContext.Provider;

export function usePage(): PageState {
  return useContext(PageContext);
}
