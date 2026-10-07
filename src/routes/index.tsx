import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@/components/cssi-workspace";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sign in · CSSI AI Agent" },
    { name: "description", content: "Sign in to the CSSI internal R&D tax-credit workspace." },
    { property: "og:title", content: "Sign in · CSSI AI Agent" },
    { property: "og:description", content: "Sign in to the CSSI internal R&D tax-credit workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SignIn,
});
