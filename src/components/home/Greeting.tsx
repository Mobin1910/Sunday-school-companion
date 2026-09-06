"use client";

import { useEffect, useState } from "react";

import { greeting, readName } from "@/local/child";

/**
 * "Good to see you!" — and, if this child has told us, their name.
 *
 * The name arrives after mount, because it lives on the device and the page
 * itself is prerendered. So the greeting without a name is not a loading
 * state: it is the real, finished greeting for everyone who has not given
 * one, and it is warm on its own. Nothing is invented, nothing is guessed
 * and nothing here asks for it.
 */
export default function Greeting() {
  const [name, setName] = useState("");

  useEffect(() => setName(readName()), []);

  return (
    <h1 className="mt-3 text-4xl leading-tight text-balance">
      {greeting(name)}
    </h1>
  );
}
