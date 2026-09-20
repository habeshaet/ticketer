import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NavBar } from "@/components/NavBar";
import { SetupGate } from "@/components/SetupGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ticket Mailer",
  description:
    "Generate ticketing, rebooking and dormitory e-mails in seconds from your staff, trainee and flight lists.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Ticket Mailer",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a4726",
  width: "device-width",
  initialScale: 1,
  // let people pinch-zoom; never trap them
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900 antialiased">
        <NavBar />
        <main className="mx-auto max-w-[1600px] px-4 py-6">
          <SetupGate>{children}</SetupGate>
        </main>
      </body>
    </html>
  );
}
