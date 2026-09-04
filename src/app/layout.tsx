import type { Metadata, Viewport } from "next";
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
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
