# Parallax — YouTube Intelligence Hub

A working local MVP for multi-brand YouTube analytics, video diagnostics, competitor intelligence, strategy opportunities, alerts and client reporting. It supports manual/live setup plus an optional five-brand demo pack that needs no external credentials.

## Quick start

Requirements: Node.js 20.9+ (Node 24 is supported) and npm.

### One-click Windows start

Double-click `Start-Parallax.cmd` in the project folder. It checks Node/npm, performs first-run setup when needed, starts the local server and report scheduler, and opens the app automatically. Keep the terminal window open while using the app; press `Ctrl+C` to stop it.

The PowerShell launcher can also be run directly:

```powershell
.\Start-Parallax.ps1
```

### Manual start

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Parallax opens with its animated welcome screen and then the workspace login. In local preview, use any valid email and a password with at least eight characters. Choose **Set up workspace → Load 5 demo brands** for a presentation-ready experience, or create a brand manually to test live connections. Loading the demo pack is idempotent and does not remove manually created brands.

Run the local scheduler in a second terminal:

```bash
npm run worker
```

Scheduled jobs execute only while both the computer and worker process remain on. The one-click launcher starts both processes for you.

## What is runnable

- Portfolio Overview with five optional demo brands plus any manually created brands.
- Channel dashboards with working global date/comparison filters, real charts, traffic sources, search queries and driver decomposition.
- Searchable/filterable Videos Library plus rule/evidence-backed Video Diagnostics.
- Public-only Competitor Intelligence and scored Strategy Opportunities.
- AI Visibility keyword discovery, owned-video coverage, live citation checks and LLM-ready content briefs.
- Wizard report builder with metric/section selection, reorder controls, editable/approvable AI commentary, branding preview and scheduling.
- Valid formatted Excel and client-friendly PDF downloads whose period, comparison, metrics and sections follow the report builder selection.
- Send-test delivery with generated Excel/PDF attachments, local preview logging by default and a real Nodemailer/SMTP adapter when configured.
- Alert rule creation/evaluation and in-app resolution.
- Local JSON persistence for brands, channels, demo snapshots, saved report templates, schedules, rules and OAuth connections under `data/runtime/` (gitignored).
- Data Health, provider interfaces and live YouTube OAuth wiring.

## Commands

```bash
npm run dev        # local app
npm run worker     # scheduled jobs; app must also be running
npm run lint       # ESLint
npm run typecheck  # strict TypeScript
npm test           # Vitest unit tests
npm run test:e2e   # Playwright critical-path journey (install Chromium once; see below)
npm run build      # production build
npm start          # serve production build
```

The development environment used to assemble this build exposed pnpm rather than npm, so verification may use `pnpm <script>`. The `package.json` scripts work unchanged with npm, and npm remains the documented operator path. Before the first E2E run, install Playwright's local browser with `npx playwright install chromium`.

## Optional Supabase Local

The optional demo UI does not require Supabase. To exercise PostgreSQL/auth/storage, install Docker Desktop and the Supabase CLI, then run:

```bash
supabase start
supabase db reset
```

The migration in `supabase/migrations/` creates the brand-scoped analytics, diagnostics, opportunities, alerts, reporting, scheduling, delivery and integration tables. `supabase/seed.sql` creates the same five demo brands/channels and initial diagnostic rules.

## YouTube API connection

The app connects to YouTube Data API v3, YouTube Analytics API and the Live Streaming resources included in the Data API.

1. Create or select a Google Cloud project.
2. Enable `youtube.googleapis.com` and `youtubeanalytics.googleapis.com` from the API Library. If Google Cloud CLI is installed, run `.\Enable-YouTubeApis.ps1 -ProjectId "your-project-id"` instead.
3. Configure the Google Auth Platform consent screen. While the app is in testing, add every Google account that will connect a channel as a test user.
4. Create an OAuth client with application type **Web application**.
5. Add `http://localhost:3000/api/auth/youtube/callback` as an authorized redirect URI.
6. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and a strong `TOKEN_ENCRYPTION_KEY` in `.env.local`, then restart the local server.
7. Open **Data & Integrations**, choose **Connect YouTube**, approve the requested permissions and use **Test APIs** in **YouTube APIs**.

The operations console supports content search, playlist creation and item management, channel/video/comment statistics, channel branding settings, resumable video uploads, channel/video/audience analytics, live broadcast and stream creation, binding, transitions and ad cuepoints. Write actions only run after a user clicks the relevant control.

The implementation uses a server-side authorization-code flow with offline access. OAuth state is validated in an HTTP-only cookie, access/refresh material is encrypted with AES-256-GCM, expired access tokens are refreshed server-side, and tokens never reach client JavaScript. Production deployment should move token storage to a managed secrets system and add rotation, role-based access and audit policy.

## AI Visibility providers

Open **AI Visibility** to discover keywords from seed terms and owned video metadata, check where owned videos appear, and generate prioritised keyword and content suggestions. The feature keeps every provider result separate and labels missing credentials instead of turning simulated results into visibility claims.

- Connect the brand's YouTube channel in **Data & Integrations** for live YouTube Search positions.
- Set `SERPAPI_API_KEY` for Google AI Overview citation checks and related searches.
- Set `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` for OpenAI web-search citation checks.
- Set `GEMINI_API_KEY` and, optionally, `GEMINI_MODEL` for Gemini grounded-search citation checks.

Without these credentials, Parallax still produces preview keyword and content opportunities from owned metadata. Visibility results are timestamped samples: model answers and search surfaces can vary by prompt, market, personalisation and time, so the tool does not represent a missing citation as universal absence or promise rankings.

## Optional OpenAI commentary

The deterministic mock commentary provider is active by default. Structured output contracts live under `src/lib/providers/llm.ts`; core scoring and diagnostics never depend on the model. `OPENAI_API_KEY` can already be used independently by AI Visibility's grounded web-search check.

## Optional SMTP

Preview delivery is active by default: Send Test creates the selected report attachments and records a preview delivery without contacting an external recipient. For real delivery, set `MAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM`. The Nodemailer adapter is active for both Send Test and the local schedule worker, and delivery outcomes are persisted.

## Workspace login

Local development accepts any valid email and a password with at least eight characters so the login flow can be tested without an identity provider. For a production run, set `PARALLAX_LOGIN_EMAIL`, `PARALLAX_LOGIN_PASSWORD` and a long random `PARALLAX_SESSION_SECRET` in `.env.local`. Production login fails closed until all three values are configured. Sessions are signed, stored in an HTTP-only cookie and expire after 12 hours, or 30 days when **Keep me signed in** is selected.

## Data and privacy behavior

- Demo data is synthetic and labeled.
- Competitor views use public-only fields. The app never suggests access to private competitor retention, search, traffic-source or audience analytics.
- Unsupported/suppressed owned metrics are represented as unavailable instead of estimated.
- Internal notes default to exclusion from client reports.
- `.env*`, runtime state and generated artifacts are ignored by git.

## Architecture notes

- UI: Next.js App Router, React, strict TypeScript, Tailwind, Recharts.
- Validation: Zod at mutable route boundaries.
- Data: opt-in deterministic five-brand seed for a zero-credential demo; persistent manual/live workspace; normalized Supabase/PostgreSQL schema for deployment.
- Reporting: ExcelJS and a deterministic `pdf-lib` renderer, both driven by the same selected report period, metrics and sections. Playwright is used for the browser E2E suite; the report data/renderer boundary allows an HTML/Playwright PDF renderer to replace `pdf-lib` later.
- Scheduling: small Node worker polling persisted schedules once per minute.
- Providers: YouTube, Trends, LLM and Mail interfaces keep external services replaceable.

See `BUILD_STATUS.md` for completed and next work.
