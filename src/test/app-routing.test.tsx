import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
const workspacePaths = [
  "/",
  "/dashboard",
  "/engagements",
  "/engagements/new",
  "/engagements/pioneer",
  "/engagements/pioneer/qualification",
  "/engagements/pioneer/qualification/thermal",
  "/engagements/pioneer/run",
  "/engagements/pioneer/trace",
  "/engagements/pioneer/draft",
  "/engagements/pioneer/editor",
  "/engagements/pioneer/verified",
  "/engagements/pioneer/report",
  "/engagements/pioneer/revision",
  "/interviews",
  "/interviews/schedule",
  "/interviews/delta-call",
  "/admin",
];

describe("App routing", () => {
  it("matches a page for every workspace route instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    for (const path of workspacePaths) {
      const matches = router.matchRoutes(path);
      expect(matches.at(-1)?.routeId, path).not.toBe(rootRouteId);
    }
  });
});
