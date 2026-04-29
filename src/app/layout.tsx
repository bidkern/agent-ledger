import type { Metadata } from "next";
import { getAppUrl } from "@/data/runtime";
import "./globals.css";

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: appUrl,
  applicationName: "Agent Ledger",
  category: "business software",
  keywords: [
    "AI agents",
    "agent governance",
    "approval queue",
    "action log",
    "AI operations",
    "agent control plane",
  ],
  title: {
    default: "Agent Ledger | The control plane for AI agents",
    template: "%s | Agent Ledger",
  },
  description:
    "Agent Ledger gives AI workers identities, budgets, tool boundaries, approval queues, logs, and billing controls from one mission-control console.",
  twitter: {
    card: "summary_large_image",
    title: "Agent Ledger | The control plane for AI agents",
    description:
      "Govern agent identity, approvals, spend, logs, and billing from one mission-control console.",
  },
  openGraph: {
    title: "Agent Ledger | The control plane for AI agents",
    description:
      "Govern agent identity, approvals, spend, logs, and billing from one desktop-friendly control plane.",
    type: "website",
    url: appUrl,
    siteName: "Agent Ledger",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="retro-page retro-theme min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
