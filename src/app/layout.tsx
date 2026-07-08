import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Fraunces is the display voice: a soft high-contrast serif whose heavy
// weights read bold and characterful rather than generic. Hanken Grotesk is
// the clean body companion. The pairing is deliberately not another all-sans.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
});
const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});
const data = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Engagd",
    template: "%s · Engagd",
  },
  description:
    "Invitations, RSVPs, live engagement, and follow-up for events, in one place.",
  openGraph: {
    title: "Engagd",
    description:
      "Invitations, RSVPs, live engagement, and follow-up for events, in one place.",
    siteName: "Engagd",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} ${data.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
