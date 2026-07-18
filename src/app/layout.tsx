import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PageTransition } from "@/components/PageTransition";

const cinzel = localFont({
  src: "../fonts/cinzel-latin-400-normal.woff2",
  variable: "--font-cinzel",
  display: "swap",
});

const cormorant = localFont({
  src: [
    {
      path: "../fonts/cormorant-garamond-latin-400-normal.woff2",
      style: "normal",
    },
    {
      path: "../fonts/cormorant-garamond-latin-400-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resonance — The Virtual Creative Studio",
  description:
    "A living creative universe for writers, game designers, and worldbuilders to imagine, shape, and bring every connection to life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg-0">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
