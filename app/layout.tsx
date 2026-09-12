import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dastarkhan — Your kitchen, your plan",
  description: "Budget-aware meal planning for Astana, Kazakhstan.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

