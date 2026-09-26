# Local Deals

Real-time local discovery for verified deals, specials, and things to do nearby.

## Project Structure

- `apps/mobile` — React Native / Expo mobile application
- `apps/api` — Fastify application API
- `apps/web` — Internal candidate review dashboard built with Vite
- `supabase` — Database migrations, seed data, and Supabase configuration

`packages/shared` and `docs` are not currently present.

## Status

Early development. The repository currently includes an Expo mobile discovery feed, a Fastify API, a local Supabase/PostgreSQL database, AI-assisted candidate extraction, an internal review/publish workflow, and a local web review dashboard.

The unauthenticated `/internal/*` API routes and the web dashboard are intentionally local-development-only. Do not expose or deploy them until authentication and authorization are implemented.

## Windows + WSL Local Setup

Prerequisites:

- WSL with Node.js and npm installed inside the Linux distribution
- Docker Desktop for Windows, installed and running with WSL integration enabled
- Expo Go on a physical device for device testing

Run the following commands inside WSL from the repository root. Install workspace dependencies:

```sh
npm install
```

Start the local Supabase stack. The project configuration applies the migrations and loads `supabase/seed.sql` for a fresh local database:

```sh
npx supabase start
```

Create the API environment file. Its default connection string targets the local Supabase database on port `54322`. Add `OPENAI_API_KEY` and `OPENAI_EXTRACTION_MODEL` when using AI extraction:

```sh
cp apps/api/.env.example apps/api/.env
```

Create the mobile environment file, then replace `YOUR_LAN_IP` with the Windows host's LAN IPv4 address so a physical device running Expo Go can reach the API:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

Start the API from the repository root:

```sh
npm run api:dev
```

In another WSL terminal, start the internal web dashboard:

```sh
npm run web:dev
```

Open the local review dashboard at [http://localhost:5173](http://localhost:5173). The Vite development server proxies its `/api` requests to the API at `http://127.0.0.1:3000`.

In another WSL terminal, start Expo in its default LAN mode:

```sh
npm run mobile:start
```

Ensure Windows Firewall and WSL networking allow the device to reach port `3000`. If Expo Go cannot discover the development server over LAN, run `npx expo start --tunnel` from `apps/mobile` as a fallback.

## macOS (Supported Secondary Environment)

The same setup is supported directly on macOS: install Node.js/npm and Docker Desktop, run the commands above in a macOS terminal, and use the Mac's LAN IPv4 address for `EXPO_PUBLIC_API_URL`. Expo Go LAN mode and the tunnel fallback work the same way.

## Internal Review Workflow

The local candidate pipeline is:

```text
raw source
  -> AI extraction
  -> pending candidate
  -> venue linking
  -> approve or reject
  -> explicit publish (approved candidates only)
  -> consumer discovery through /deals/nearby
```

Extraction validates normalized candidate data and writes it only to the candidate staging tables. New candidates remain `pending`. Venue linking associates a candidate with an existing venue, and reviewers then approve or reject it in the web dashboard. Approval changes review state only; publishing is a separate explicit action that creates the consumer-facing deal. Rejected and unpublished candidates never appear in consumer discovery.

## Local AI Deal Extraction

The internal extraction endpoint sends supplied source text to the configured OpenAI model, validates the structured output, and writes only to the `deal_candidates`, `deal_candidate_schedule_windows`, and `deal_candidate_items` staging tables. Every new candidate remains `pending`; extraction itself never creates or updates a published deal.

Set `OPENAI_API_KEY` and `OPENAI_EXTRACTION_MODEL` in `apps/api/.env`, then start the API with `npm run api:dev`. The configured model must support Structured Outputs through the Responses API.

### Source collectors

The general ingestion path selects a collector by source type before rejoining the existing extraction and review pipeline:

```text
source URL
  -> source-type collector
  -> normalized CollectedSource evidence
  -> GPT structured extraction
  -> pending candidate
  -> human review
  -> explicit publish
```

The website collector wraps the secure server-side HTML fetch and useful-text extraction described below. The Instagram collector accepts public post and reel URLs, canonicalizes them, and is ready to consume caption and public metadata through an `InstagramSourceProvider` boundary. No production Instagram provider or vendor credentials are configured yet, and Instagram collection does not fall back to HTML scraping; local requests return `501 Source collector is not configured` until a provider implementation is supplied.

Supported Instagram URL shapes are `https://www.instagram.com/p/<shortcode>/` and `https://www.instagram.com/reel/<shortcode>/`. The collector also accepts the non-`www` host, removes query strings and fragments, and derives the candidate external ID from the shortcode. Profiles, stories, explore/login pages, and unrelated Instagram paths are rejected.

Once an Instagram provider is configured, submit a source through the general endpoint:

```sh
curl --fail-with-body \
  --request POST \
  --header 'Content-Type: application/json' \
  --data @- \
  http://127.0.0.1:3000/internal/deal-candidates/extract-source <<'JSON'
{
  "source": {
    "type": "instagram",
    "url": "https://www.instagram.com/p/ABC123/",
    "externalId": null,
    "label": null
  },
  "venueId": null
}
JSON
```

To fetch and extract a public restaurant deal page server-side, submit its URL to the local URL extraction endpoint:

```sh
curl --fail-with-body \
  --request POST \
  --header 'Content-Type: application/json' \
  --data @- \
  http://127.0.0.1:3000/internal/deal-candidates/extract-url <<'JSON'
{
  "source": {
    "type": "official_website",
    "url": "https://example.com/happy-hour",
    "externalId": "example-url-happy-hour-2026-09-20",
    "label": "Official happy hour page"
  },
  "venueId": null
}
JSON
```

The API accepts only public HTTP(S) HTML destinations, applies redirect and response-size limits, removes common page boilerplate, and caps extracted text before invoking the existing model extraction and candidate staging flow. The resulting candidate remains pending until it is reviewed and explicitly published.

Submit source content from another terminal:

```sh
curl --fail-with-body \
  --request POST \
  --header 'Content-Type: application/json' \
  --data @- \
  http://127.0.0.1:3000/internal/deal-candidates/extract <<'JSON'
{
  "source": {
    "type": "official_website",
    "url": "https://example.com/happy-hour",
    "externalId": "example-happy-hour-2026-09-20",
    "label": "Official happy hour page"
  },
  "venueId": null,
  "content": "Happy hour Monday through Friday from 3 PM to 6 PM. House cocktails are $6."
}
JSON
```

Use a stable `externalId` supplied by the source when available. Repeating the request with the same source type and external ID returns `409` and the existing candidate ID instead of creating a duplicate. Change the example external ID when intentionally testing a new extraction. A valid local venue UUID may replace `null`; unknown venue IDs are rejected before the model is called.
