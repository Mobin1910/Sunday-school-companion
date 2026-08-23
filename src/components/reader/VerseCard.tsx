/**
 * The verse the chapter leaves behind.
 *
 * Deliberately the quietest page in the chapter. No picture competes with the
 * words, because this is the one page where the words are the point.
 */
export default function VerseCard({
  text,
  reference,
}: {
  text: string;
  reference: string;
}) {
  return (
    <div className="breathe flex max-w-sm flex-col px-6 items-center gap-6 text-center">
      <p className="text-3xl leading-relaxed text-balance">{text}</p>
      <p className="text-lg text-ink-soft">{reference}</p>
    </div>
  );
}
