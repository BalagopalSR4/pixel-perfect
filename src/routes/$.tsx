import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/cssi-workspace";

export const Route = createFileRoute("/$")({
  head: ({ location }) => {
    const section = location.pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ?? "Workspace";
    const title = `${section.replace(/\b\w/g, (letter) => letter.toUpperCase())} · CSSI AI Agent`;
    const description = `CSSI ${section} workspace for R&D tax-credit review.`;
    return { meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ] };
  },
  component: Workspace,
});