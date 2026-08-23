/**
 * Stands in for an illustration that has not been drawn yet.
 *
 * This is a normal, expected state — not an error. Chapters are written long
 * before they are illustrated, and nothing about building the app should wait
 * on an illustrator. So this is drawn calmly, in the product's own palette,
 * and it says which picture is missing.
 */
export default function PicturePlaceholder({
  name,
  className = "aspect-4/3 w-full rounded-card",
}: {
  name: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center border-2 border-dashed border-edge bg-ground-raised p-4 ${className}`}
      role="img"
      aria-label={`Illustration not drawn yet: ${name}`}
    >
      <span className="text-center text-sm break-words text-ink-soft">
        {name}
      </span>
    </div>
  );
}
