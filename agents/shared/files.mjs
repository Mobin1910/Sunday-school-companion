/**
 * What a curriculum page is allowed to be.
 *
 * Its own module because two very different things need it and neither should
 * have to import the other: the agent, deciding which uploads it can work
 * with, and the Gemini provider, deciding what it may attach to a request.
 * When this lived in the provider, asking "is this file usable?" meant
 * importing an AI client, which is how a pipeline that makes no AI calls ends
 * up loading one anyway.
 */

export const SUPPORTED = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".pdf", "application/pdf"],
]);

export function mimeFor(name) {
  const at = String(name).lastIndexOf(".");
  return at === -1 ? undefined : SUPPORTED.get(name.slice(at).toLowerCase());
}

/** The extensions, for saying out loud what is accepted. */
export function supportedExtensions() {
  return [...SUPPORTED.keys()];
}
