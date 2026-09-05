import Link from "next/link";

/**
 * Up one level, and it always says where that is.
 *
 * "Back" alone asks a child to remember how they got somewhere. Naming the
 * destination — "All chapters", "Stephen" — means they can read where they
 * are going instead.
 */
export default function BackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="-ml-2 flex min-h-12 w-fit items-center gap-1 rounded-full px-2 text-base text-ink-soft"
    >
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {label}
    </Link>
  );
}
