/**
 * Where a piece of content came from.
 *
 * Several teachers will eventually be uploading curriculum, an agent will be
 * reading it, and a model will be interpreting photographs of printed pages.
 * When somebody asks "why does the Beginner verse say *this*?", the answer has
 * to be a record and not a recollection.
 *
 * So every draft carries: which class and chapter, which Drive folder, which
 * files by name and id, when they were read, which model read them, how
 * confident it was, when the practice was generated and by what, and whether a
 * human has approved it. That last field is always `false` when the agent
 * writes it — the agent cannot approve its own work.
 */

export function provenanceFor({
  classId,
  className,
  chapter,
  source,
  files,
  model,
  confidence,
  extractedAt,
  cached,
  review,
}) {
  return {
    class: { id: classId, display: className },
    chapter,
    source: {
      kind: source.kind,
      driveFolderId: source.folderId ?? null,
      driveFolderPath: source.path ?? null,
      localPath: source.localPath ?? null,
      files: files.map((f) => ({
        name: f.name,
        id: f.id ?? null,
        mimeType: f.mimeType,
        size: f.size ?? null,
      })),
    },
    extraction: {
      provider: "google-gemini",
      model,
      confidence,
      at: extractedAt,
      fromCache: Boolean(cached),
    },
    generation: {
      by: "agents/memory-verse",
      at: new Date().toISOString(),
      // The ladder is deterministic: same verse in, same practice out. Worth
      // recording, because it is the reason seven variants cost no quota.
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
