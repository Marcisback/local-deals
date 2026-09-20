# Local Deals

Real-time local discovery for verified deals, specials, and things to do nearby.

## Project Structure

- `apps/mobile` — React Native / Expo mobile application
- `apps/api` — Application API
- `packages/shared` — Shared TypeScript types, schemas, and constants
- `supabase` — Database migrations, seed data, and Supabase configuration
- `docs` — Product and system documentation

## Status

Early development. The repository currently includes an Expo mobile discovery feed, a Fastify API, and a local Supabase/PostgreSQL schema with seed data.

## macOS Local Setup

Prerequisites:

- Node.js and npm
- Docker Desktop, installed and running
- Expo Go on a physical device for device testing

Install workspace dependencies from the repository root:

```sh
npm install
```

Start the local Supabase stack. The project configuration applies the migrations and loads `supabase/seed.sql` for a fresh local database:

```sh
npx supabase start
```

Create the API environment file. Its default connection string targets the local Supabase database on port `54322`:

```sh
cp apps/api/.env.example apps/api/.env
```

Create the mobile environment file, then replace `YOUR_LAN_IP` with the Mac's LAN IP address so Expo Go can reach the API:

```sh
cp apps/mobile/.env.example apps/mobile/.env
```

Start the API from the repository root:

```sh
npm run api:dev
```

In another terminal, start Expo in its default LAN mode:

```sh
npm run mobile:start
```

If the physical device cannot connect over LAN, run `npx expo start --tunnel` from `apps/mobile` as a fallback.

## Local AI Deal Extraction

The internal extraction endpoint sends supplied source text to the configured OpenAI model, validates the structured output, and writes only to the `deal_candidates`, `deal_candidate_schedule_windows`, and `deal_candidate_items` staging tables. Every new candidate remains `pending`; this workflow never creates or updates a published deal.

Set `OPENAI_API_KEY` and `OPENAI_EXTRACTION_MODEL` in `apps/api/.env`, then start the API with `npm run api:dev`. The configured model must support Structured Outputs through the Responses API.

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
