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
