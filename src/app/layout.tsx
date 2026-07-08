import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Schibsted_Grotesk,
  Spline_Sans_Mono,
} from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});
const data = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-data",
});

export const metadata: Metadata = {
  title: "Engagd",
  description:
    "Invitations, RSVPs, live engagement, and follow-up for events, in one place.",
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
