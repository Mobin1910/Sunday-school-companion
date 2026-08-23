/**
 * Stands in for an illustration that has not been drawn yet.
 *
 * This is a normal, expected state — not an error. Chapters are written long
 * before they are illustrated, and nothing about building the app should wait
 * on an illustrator. So this is drawn calmly, in the product's own palette,
 * and it says which picture is missing.
 */
export default function PicturePlaceholder({ name }: { name: string }) {
  return (
    <div
      className="flex aspect-4/3 w-full items-center justify-center rounded-card border-2 border-dashed border-edge bg-ground-raised p-6"
      role="img"
      aria-label={`Illustration not drawn yet: ${name}`}
    >
      <span className="text-center text-base break-words text-ink-soft">
        {name}
      </span>
    </div>
  );
}
