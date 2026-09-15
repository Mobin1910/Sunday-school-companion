/**
 * Where a piece of content came from.
 *
 * Several teachers will eventually be uploading curriculum, an agent will be
 * downloading it, and somebody will be reading photographs of printed pages.
 * When somebody asks "why does the Beginner verse say *this*?", the answer has
 * to be a record and not a recollection.
 *
 * So every draft carries: which class and chapter, which Drive folder, which
 * files by name, id and checksum, what the teacher typed into the Sheet, what
 * was read off the page, who read it and when, how confident they were, what
 * they were unsure about, whether the two sources agreed, and whether a human
 * has approved it. That last field is always `false` when the agent writes it
 * — the agent cannot approve its own work.
 *
 * The checksums matter more than they look. They are what makes the record
 * falsifiable: a year from now you can re-download the folder and prove the
 * pages are the ones this verse was read from, or discover that they are not.
 */

export function provenanceFor({
  classId,
  className,
  chapter,
  source,
  files,
  extraction,
  teacher,
  crossCheck,
  validation,
  caveats,
  review,
}) {
  return {
    class: { id: classId, display: className },
    chapter,
    source: {
      kind: source.kind,
      /*
        Both spellings accepted. A live Drive listing calls these `folderId`
        and `path`; the request file that --fetch writes has already renamed
        them to say which kind of place they point at. This is the seam
        between the two, and reading only one side of it silently dropped the
        Drive folder out of every draft's provenance — which is the one field
        that makes a draft traceable back to the pages it came from.
      */
      driveFolderId: source.driveFolderId ?? source.folderId ?? null,
      driveFolderPath: source.driveFolderPath ?? source.path ?? null,
      localPath: source.localPath ?? null,
      files: files.map((f) => ({
        name: f.name,
        id: f.id ?? null,
        mimeType: f.mimeType,
        size: f.size ?? null,
        // Drive's own md5 where there is one, and ours where there is not.
        md5Checksum: f.md5Checksum ?? null,
        sha256: f.sha256 ?? null,
      })),
      fingerprint: source.fingerprint ?? null,
    },
    extraction: {
      /*
        A person-shaped reader, not a provider endpoint. "claude-agent" means
        a Claude session looked at these images and typed what it saw, under
        supervision, rather than an unattended API call having produced it.
        Worth distinguishing in the record, because the two have different
        failure modes and a reviewer should know which one they are checking.
      */
      extractedBy: extraction.extractedBy ?? "claude-agent",
      /*
        How it was read, not merely that it was. The difference between
        looking at a page and running OCR over it is the difference between
        two error profiles, and a reviewer deciding how hard to check needs
        to know which one produced this. Defaulted rather than assumed, so a
        record can never quietly claim the stronger of the two.
      */
      method:
        extraction.method ?? "visual inspection of the downloaded curriculum pages",
      at: extraction.at,
      sourceFile: extraction.sourceFile ?? null,
      confidence: extraction.confidence,
      ambiguities: extraction.ambiguities ?? [],
      verse: { text: extraction.text, reference: extraction.reference },
    },
    teacher: teacher?.available
      ? {
          available: true,
          sheetId: teacher.sheetId ?? null,
          tab: teacher.tab ?? null,
          verse: teacher.text || null,
          reference: teacher.reference || null,
          status: teacher.status || null,
          contributor: teacher.contributor || null,
        }
      : { available: false, reason: teacher?.reason ?? "not read" },
    /*
      Whether two independent sources agreed. "unavailable" is its own value
      and must never be read as agreement: a verse nobody confirmed is a
      weaker claim than a verse two people arrived at separately, and the
      draft should be honest about which one it is.
    */
    crossCheck: crossCheck ?? { status: "unavailable", reason: "not performed" },
    validation: {
      passed: validation?.passed ?? false,
      gates: validation?.gates ?? [],
      reason: validation?.reason ?? null,
    },
    /*
      Things that are true about this draft and are not faults in it.

      Distinct from `ambiguities`, which are doubts about the verse itself and
      stop the run. A caveat is a doubt about the *circumstances* — a page
      that could not be read, a second opinion that did not exist. Neither
      makes the verse wrong, and both change how hard a reviewer should look,
      so they travel with the draft and force `review.required`.
    */
    caveats: caveats ?? [],
    generation: {
      by: "agents/memory-verse",
      at: new Date().toISOString(),
      // The ladder is deterministic: same verse in, same practice out. Worth
      // recording, because it is the reason seven variants cost nothing.
      deterministic: true,
    },
    review: {
      status: review?.status ?? "draft",
      required: review?.required ?? false,
      reason: review?.reason ?? null,
      approved: false,
      approvedBy: null,
      approvedAt: null,
    },
  };
}
