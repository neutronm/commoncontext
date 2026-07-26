import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CommonContext",
  description:
    "Immutable, permissioned shared context for people and their AI assistants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body
        className={`${instrumentSans.className} flex min-h-full flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
