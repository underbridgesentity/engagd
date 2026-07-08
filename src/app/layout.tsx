import type { Metadata } from "next";
import { Inter, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

// Inter carries both display and body. Headings lean on its heaviest weights
// with tight tracking (see globals.css) so the type feels bold, not default.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800", "900"],
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
        {children}
      </body>
    </html>
  );
}
