# Local Deals Agent Guide

## Project Overview
- Local Deals is a real-time local discovery app for nearby happy hours, food and drink specials, deals, events, and things to do.
- Keep the architecture flexible enough to expand beyond happy hours.

## Repository Architecture
- This is an npm workspaces monorepo.
- `apps/mobile` - React Native + Expo mobile application.
- `apps/api` - backend API.
- `packages/shared` - shared TypeScript types, schemas, constants, and utilities.
- `supabase` - database migrations and Supabase configuration.
- `docs` - product and technical documentation.
- Do not claim planned directories are implemented if they are empty or only reserved.

## Mobile Stack
- Current mobile baseline is Expo SDK 54 with React Native, TypeScript, and `expo-location`.
- Physical-device development uses Expo Go.
- The mobile app uses a workspace-local entry point at `apps/mobile/index.js` that calls `registerRootComponent(App)`.
- Preserve the standard Expo Metro config unless a change is demonstrably necessary.
- Prefer Expo-supported APIs while the app remains Expo Go based.

## Development Environment
- Primary development environment is macOS.
- Run Node, npm, Docker Desktop, and the Supabase CLI directly on macOS.
- Physical iPhone testing uses Expo Go.
- Prefer Expo's default LAN mode when the Mac and physical device are on the same network.
- Use `npx expo start --tunnel` as a fallback when LAN discovery or connectivity is unavailable.
- Set `EXPO_PUBLIC_API_URL` to the Mac's LAN address so Expo Go can reach the local API.
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
- Reuse shared types and utilities only when they genuinely belong in `packages/shared`.
- Do not move code into shared packages prematurely.
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
- For physical-device runtime testing on macOS, start with `npm run mobile:start` in LAN mode.
- If Expo Go cannot reach the Mac over LAN, use `npx expo start --tunnel` from `apps/mobile`.
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
- Backend: dedicated API under `apps/api`.
- Database: Supabase / PostgreSQL, with PostGIS planned for geographic queries.
- Shared: `packages/shared` for genuinely cross-application TypeScript contracts.
- Future web application may live under `apps/web`.
- Mobile clients should not eventually contain privileged database or business logic that belongs in the backend.

## Current Product Development State
- The mobile Expo bootstrap exists.
- The mobile app retrieves foreground device location, reverse-geocodes it, and renders a nearby-deals feed from the API.
- The API implements health checks, nearby deal discovery, and internal deal-candidate ingestion.
- Supabase migrations and deterministic local seed data exist, including curated development fixtures.
- Project-local Supabase configuration exists so the stack can be started reproducibly through the workspace CLI.
- Maps, authentication, navigation, and production deployment are not implemented yet.

## Documentation Maintenance
- Update this file when development environment assumptions change.
- Update this file when major architecture decisions change.
- Update this file when the package/runtime baseline changes significantly.
- Update this file when important repository-wide conventions are introduced.
- Do not update this file for every small feature.
