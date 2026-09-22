# Parallax — YouTube Intelligence Hub — Build Status

Updated: 22 September 2026

## Completed

- Next.js 16 App Router foundation with strict TypeScript, Tailwind CSS and centralized Parallax theme tokens.
- Responsive app shell, collapsed navigation, brand/date/comparison controls and URL state.
- Hybrid workspace with manual/live onboarding and an idempotent one-click pack containing five fictional brands, five channels, 140 videos, 90 days of metrics per channel, public competitors, alerts, opportunities and report templates.
- Demo-critical workflow: Overview, Channel Dashboard, Videos Library, Video Diagnostics, Strategy Opportunities and Report Builder.
- Supporting flows: Competitors, Alerts, Reports, Data Health / Integrations and Settings.
- Animated Parallax welcome, workspace login/session protection and sign-out flow.
- AI Visibility workspace with metadata/seed keyword discovery, YouTube ranking checks, Google AI Overview, OpenAI web-search and Gemini grounded-search citation evidence, plus prioritised keyword and content briefs.
- Real Excel and PDF generation endpoints, including selected section/metric/range behavior, local state persistence, report template save, schedule creation and local worker.
- Render-and-inspect QA for all nine default Excel sheets and all four default PDF pages, plus custom report variants.
- Working Send Test path with generated attachments, delivery logs, preview mode and a Nodemailer/SMTP adapter used by the scheduler.
- Five-step brand/channel onboarding plus Google/YouTube server-side OAuth with least-privilege scopes, initial owned-channel sync and encrypted token-at-rest storage.
- Provider boundaries for YouTube, Trends, LLM and Mail.
- Supabase local schema/migration/seed covering the requested V1 entities.
- Unit coverage for diagnostics, opportunity score re-normalization, date aggregation, report brand scoping, report export selection, schedules, sessions, Shorts and AI Visibility recommendations.
- Playwright Chromium critical-path E2E: idempotent five-brand demo load → channel analysis → video diagnostic → opportunity → Excel/PDF downloads → send test.

## Current

- MVP verification is green: strict typecheck, zero-warning lint, 31 unit tests and the Next.js production build all pass. The existing Chromium critical-path E2E remains available for operator runs.

## Next

- Refine the current violet tokens if a future Parallax visual identity is approved.
- Exercise a real YouTube connection with production Google credentials and validate supported Analytics metric/dimension combinations.
- Add approved SerpApi, OpenAI and Gemini credentials, then establish a recurring query benchmark set for live AI Visibility checks.
- Add approved client logos/footer assets and expand the PDF narrative into dedicated audience/search and competitor pages.
- Exercise SMTP delivery with the target mail server credentials; preview delivery remains the credential-free default.
- Run Supabase Local via Docker/CLI on a machine where those tools are installed; demo mode remains independent.
