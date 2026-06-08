import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Floras Orchestrator",
  description: "Agent orchestration dashboard for Floras climate platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
