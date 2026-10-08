import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/cssi-workspace";

// Signed-in workspace URLs. Sign-in stays on /. Each path renders an existing screen:
// /dashboard, /engagements, /engagements/new, /engagements/:id,
// /engagements/:id/qualification, /engagements/:id/qualification/:projectId,
// /engagements/:id/qualification/:projectId/confirm,
// /engagements/:id/run, /engagements/:id/trace, /engagements/:id/draft,
// /engagements/:id/editor, /engagements/:id/verified, /engagements/:id/report,
// /engagements/:id/revision, /interviews, /interviews/schedule, /interviews/:meetingId, /admin.
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