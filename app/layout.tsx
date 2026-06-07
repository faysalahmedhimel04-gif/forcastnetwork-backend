import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForcastNetwork Backend API",
  description: "Production-ready backend API for the Forecast Creator Network. Built with Next.js 15 + Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-950 text-white">
        {children}
      </body>
    </html>
  );
}
