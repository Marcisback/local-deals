# Local Deals Agent Guide

## Project Overview
- Local Deals is a real-time local discovery app for nearby happy hours, food and drink specials, deals, events, and things to do.
- Keep the architecture flexible enough to expand beyond happy hours.

## Repository Architecture
- This is an npm workspaces monorepo.
- `apps/mobile` - React Native + Expo mobile application.
- `apps/api` - Fastify backend API.
- `apps/web` - Vite-based internal candidate review dashboard.
- `supabase` - database migrations and Supabase configuration.
- `packages/shared` and `docs` are not currently present; do not describe them as implemented.
- Do not claim planned directories are implemented if they are empty or only reserved.

## Mobile Stack
- Current mobile baseline is Expo SDK 54 with React Native, TypeScript, and `expo-location`.
- Physical-device development uses Expo Go.
- The mobile app uses a workspace-local entry point at `apps/mobile/index.js` that calls `registerRootComponent(App)`.
- Preserve the standard Expo Metro config unless a change is demonstrably necessary.
- Prefer Expo-supported APIs while the app remains Expo Go based.

## Development Environment
- Primary development environment is Windows with the repository and development commands running in WSL.
- Run Node, npm, and the workspace Supabase CLI inside WSL. Run Docker Desktop on Windows with WSL integration enabled.
- macOS remains a supported secondary environment; run Node, npm, Docker Desktop, and the workspace Supabase CLI directly on macOS.
- Physical iPhone testing uses Expo Go.
- Prefer Expo's default LAN mode when the development computer and physical device are on the same network.
- Use `npx expo start --tunnel` as a fallback when LAN discovery or connectivity is unavailable.
- Set `EXPO_PUBLIC_API_URL` to the development computer's LAN address so Expo Go can reach the API. On Windows + WSL, use the Windows host's LAN address and ensure the API port is reachable through WSL networking and Windows Firewall.
- Local Supabase requires Docker Desktop to be installed and running.

## Expo / Mobile Rules
- Use `npx expo install` for Expo and React Native packages when appropriate so versions remain SDK-compatible.
- Preserve Expo SDK compatibility.
- Do not arbitrarily upgrade Expo, React, or React Native.
- Do not use `npm audit fix --force`.
- Preserve the workspace-local Expo entry point.
- Do not create a root-level `App.tsx` as a workaround.
- Avoid unnecessary native dependencies.
- Keep changes compatible with Expo Go unless the task explicitly requires otherwise.

## Engineering Principles
- Inspect before editing.
- Understand the existing architecture before adding abstractions.
- Make the smallest coherent change that satisfies the task.
- Do not implement unrequested adjacent features.
- Prefer simple, readable TypeScript over premature abstraction.
- Avoid `any` unless there is a documented reason.
- Handle async failures explicitly.
- Handle user-denied permissions gracefully.
- Do not silently swallow errors.
- Avoid unnecessary dependencies.
- Do not introduce `packages/shared` until cross-application contracts genuinely justify it.
- Keep secrets and credentials out of source control.
- Environment-specific secrets belong in ignored environment files.
- Never commit `node_modules`.

## Scope Control
1. Read relevant AGENTS instructions.
2. Inspect relevant files.
3. Implement only the requested scope.
4. Validate the change.
5. Review `git diff` and `git status`.
6. Report results.
7. Stop.
- Do not continue into the next product feature unless explicitly asked.

## Validation
- For mobile changes, when applicable run:
  - `npx expo install --check`
  - `npx expo-doctor`
  - `npx tsc --noEmit`
- For physical-device runtime testing, start with `npm run mobile:start` in LAN mode.
- If Expo Go cannot discover the development server over LAN, use `npx expo start --tunnel` from `apps/mobile`.
- Do not claim runtime validation succeeded unless the environment actually supported it.
- Before finishing, inspect `git diff`, inspect `git status`, check for unintended files, and report checks that were performed or could not be performed.

## Git / Change Hygiene
- Keep changes scoped to the task.
- Do not modify unrelated files.
- Do not rewrite working configuration without a reason.
- Do not delete user-created work merely because it is untracked.
- Treat unexpected existing changes as potentially user-owned.
- Do not commit or push unless explicitly requested.
- Do not change branches unless explicitly requested.

## Product Architecture Boundaries
- Mobile: React Native + Expo.
- Backend: Fastify API under `apps/api`.
- Web: internal candidate review dashboard under `apps/web`.
- Database: Supabase / PostgreSQL with PostGIS-backed geographic queries.
- Shared: no shared package is currently implemented; add one only for genuinely cross-application TypeScript contracts.
- Mobile clients should not eventually contain privileged database or business logic that belongs in the backend.
- All `/internal/*` API endpoints are currently unauthenticated and intentionally restricted to local development. They must remain local/dev-only and must not be exposed or deployed until authentication and authorization are implemented.

## Current Product Development State
- The Expo mobile app retrieves foreground device location, reverse-geocodes it, and renders the consumer nearby-deals discovery feed.
- The Fastify API implements health checks, nearby deal discovery, AI-assisted candidate extraction, internal candidate management, review actions, venue linking, and explicit publication.
- Supabase/PostgreSQL migrations and deterministic local seed data exist, including curated development fixtures and the candidate staging/publication schema.
- The candidate workflow is implemented: raw source content is extracted into a pending candidate, linked to a venue, approved or rejected, and explicitly published before it can appear in consumer discovery.
- `apps/web` is the internal dashboard for listing and inspecting candidates, linking venues, approving or rejecting candidates, and explicitly publishing approved candidates.
- Approval does not publish a candidate; publication is a separate explicit action.
- Internal API routes are local-development-only and unauthenticated until authentication and authorization are implemented.
- Project-local Supabase configuration exists so the stack can be started reproducibly through the workspace CLI.
- Maps, authentication, navigation, and production deployment are not implemented yet.

## Documentation Maintenance
- Update this file when development environment assumptions change.
- Update this file when major architecture decisions change.
- Update this file when the package/runtime baseline changes significantly.
- Update this file when important repository-wide conventions are introduced.
- Do not update this file for every small feature.
