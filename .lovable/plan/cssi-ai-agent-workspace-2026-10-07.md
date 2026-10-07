# CSSI AI Agent workspace

## Build
- Replace the blank home page with the CSSI staff sign-in, then route into the dashboard.
- Establish the supplied mint, navy, pale-canvas visual system and reusable desktop app shell, navigation, activity rows, status badges, and charts.
- Seed a single React state store with the supplied engagement, project, interview, wage, and user examples; keep sign-in, integrations, uploads, exports, and agent actions simulated.
- Implement the primary engagement, qualification/checkpoint, run/trace, draft/editor/review/report/revision, interview/capture, and admin paths, with browser navigation and meaningful state changes.
- Keep the product internal-only: no client access, sharing, or delivery actions; preserve the qualification and wage-verification checkpoints.

## Technical details
- Keep the app on TanStack Start. Use the index route for `/` and a catch-all content route for the supplied nested workspace URLs.
- Keep seeded sample records in one data module and share prototype state through a React provider; do not add Cloud, authentication, or live services.
- Add leaf-route metadata and document the app's structural decisions in the project guidance file.
- Validate the preview navigation and primary flows, then review the preview build and existing routing tests.