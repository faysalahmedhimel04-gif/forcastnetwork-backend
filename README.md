# ForcastNetwork Backend

Dedicated production-ready backend API for the Forecast Creator Network.

This is a **separate Next.js 15 App Router project** that can be deployed independently and used as the backend for the frontend (located in the sibling `forcastnetwork` folder).

## Why a Separate Backend?

- Better separation of concerns
- Can scale / deploy the API independently
- Central place for business logic and validation
- Easier to add rate limiting, caching, or other backend concerns later
- The frontend calls this API instead of talking directly to Supabase (recommended for production)

## Tech Stack
- Next.js 15 (App Router)
- TypeScript
- Supabase (Auth + PostgreSQL via RLS)
- Zod for validation
- Server-side only Supabase clients

## Folder Structure

```
forcastnetwork-backend/
├── app/
│   ├── api/                    # All API endpoints (REST-style)
│   │   ├── health/route.ts
│   │   ├── forecasts/
│   │   │   ├── route.ts        # List + Create
│   │   │   └── [id]/route.ts   # Get + Resolve
│   │   ├── comments/route.ts
│   │   ├── follows/route.ts
│   │   ├── profiles/[id]/route.ts
│   │   ├── leaderboard/route.ts
│   │   └── markets/route.ts    # Polymarket Gamma proxy
│   ├── layout.tsx
│   └── page.tsx                # Simple API documentation homepage
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # Server + Admin clients
│   │   └── middleware.ts
│   └── auth.ts                 # Token extraction helper
├── middleware.ts               # Supabase session middleware
├── types/
│   └── index.ts                # Shared TypeScript types
├── .env.example
├── supabase/
│   └── schema.sql              # (Copy from frontend or run manually)
└── ...
```

## Key Files & Their Purpose

- **.env.example** — Environment variables template. Copy to `.env.local`.
- **lib/supabase/server.ts** — Two clients:
  - `createClient()`: For user-authenticated operations (uses anon key + user token).
  - `createAdminClient()`: Service role (bypasses RLS, use carefully).
- **lib/auth.ts** — `getAuthenticatedUser(request)` extracts and validates the Bearer token sent by the frontend.
- **middleware.ts** — Runs on the Edge. Can be extended for logging or additional checks.
- **app/api/forecasts/route.ts** — Core CRUD for forecasts with Zod validation.
- **app/api/forecasts/[id]/route.ts** — Resolve endpoint (owner-only).
- **app/api/comments/route.ts**, **follows**, **profiles**, **leaderboard** — Supporting endpoints.
- **app/api/markets/route.ts** — Proxy for Polymarket data (avoids CORS + centralizes external calls).
- **types/index.ts** — Shared types matching the frontend.

## Setup

1. Copy `.env.example` to `.env.local` and fill values (use the same Supabase project as the frontend or a dedicated one).

2. Run the database schema:
   - Copy `supabase/schema.sql` from the frontend project or paste it into Supabase SQL Editor.

3. Start the backend:
   ```bash
   npm run dev
   ```

4. The API will be available at `http://localhost:3001` (or whatever port).

## How the Frontend Uses This Backend

Instead of calling Supabase directly from the frontend:

- Frontend obtains the Supabase session token after login.
- Frontend sends requests to this backend with:
  ```ts
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
  ```
- All protected operations (create forecast, comment, follow, resolve, update profile) go through this backend.

This gives you a clean separation and a single place to enforce business rules.

## Authentication Flow

1. User logs in on the **frontend** using Supabase client.
2. Frontend stores the session.
3. For any write or protected action, frontend calls the backend API and includes the access token in the Authorization header.
4. Backend validates the token using Supabase and performs the action under the user's RLS context.

## Production Notes

- Deploy this backend separately (Vercel, Railway, Fly.io, etc.).
- Set `NEXT_PUBLIC_SITE_URL` and proper CORS if needed (currently the API is open for the frontend to call).
- Use a strong `SUPABASE_SERVICE_ROLE_KEY` only when absolutely necessary.
- Consider adding rate limiting (e.g. with Upstash or Vercel Edge Config) for production.
- Monitor via Supabase logs + your hosting platform.

## Environment Variables

See `.env.example` for the full list.

## Running Both Frontend + Backend Locally

- Frontend: `cd ../forcastnetwork && npm run dev`
- Backend: `cd forcastnetwork-backend && npm run dev` (will run on port 3001 by default)

Update the frontend fetch calls to point to `http://localhost:3001/api/...` during development.

---

This backend is designed to be the single source of truth for all data operations while leveraging Supabase for auth and the database.
