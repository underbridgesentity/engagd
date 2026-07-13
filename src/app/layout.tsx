import type { Metadata } from "next";
import { Inter, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Inter carries display and body, set tight and confident on a warm light
// canvas. The character comes from weight, spacing, and layout rather than
// a novelty face.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        className={`${inter.variable} ${data.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
        <div className="grain-overlay" aria-hidden />
      </body>
    </html>
  );
}
