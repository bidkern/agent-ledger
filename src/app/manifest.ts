import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agent Ledger",
    short_name: "Agent Ledger",
    description: "Desktop-friendly control plane for AI agents.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#11212b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
