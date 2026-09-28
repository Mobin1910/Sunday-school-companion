import { type InstallRecord, BLANK, repairInstallRecord } from "@/pwa/record";

import { read, write } from "./store";

/**
 * Where the install record is kept, and the only file that knows that.
 *
 * It is two functions on purpose. The *rules* about this record — what it
 * means, what a dismissal does to it, how a corrupt one is repaired — live in
 * `pwa/record.ts` and are pure, so they can be tested without a browser. This
 * file is the one place that knows which drawer they go in, and it is
 * deliberately too small to hide a decision in.
 *
 * `ssc.pwa-install`, alongside everything else this device remembers, so
 * "clear everything" in Settings reaches it by the same prefix scan that
 * reaches a child's name. See `store.ts`.
 *
 * It is the only key in that namespace that is not about a child, and it
 * carries nothing about one: no name, no class, no progress, no device.
 */

export function readInstallRecord(): InstallRecord {
  return read<InstallRecord>("pwa-install", repairInstallRecord, BLANK);
}

export function saveInstallRecord(record: InstallRecord): InstallRecord {
  write("pwa-install", record);
  return record;
}
