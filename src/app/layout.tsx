import type { Metadata, Viewport } from "next";

import Preferences from "@/components/Preferences";
import { DOORWAY_SCRIPT } from "@/local/child";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sunday School Companion",
  description: "Bible stories to read again at home.",
};

export const viewport: Viewport = {
  themeColor: "#fbf3e8",

  // Children hold devices close and press hard. Let them zoom if they need to,
  // but never zoom by accident — the font sizes are already large enough.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        {/*
          Runs before anything paints, so the first frame of the first screen
          is already the right one. It sets an attribute and nothing else —
          the stylesheet does the hiding, and this makes no request and
          writes nothing. See `DOORWAY_SCRIPT`.
        */}
        <script dangerouslySetInnerHTML={{ __html: DOORWAY_SCRIPT }} />

        <Preferences />
        {children}
      </body>
    </html>
  );
}
