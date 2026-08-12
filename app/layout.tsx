import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tadiwa & Adawari",
  description: "Welcome to Tadiwa and Adawari's celebration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
