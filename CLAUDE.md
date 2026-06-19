# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run from repo root)
npm install

# Run both servers concurrently (API on :4000, web on :5173)
npm run dev

# Build both apps
npm run build

# Database
npm run db:migrate -w api        # prisma migrate deploy (production)
npm run db:migrate:dev -w api    # prisma migrate dev (development)
npm run db:seed -w api           # seed demo data
npm run db:generate -w api       # regenerate Prisma client after schema changes
npx prisma studio -w api         # visual DB explorer

# Web only
npm run lint -w web              # ESLint

# Run API in production mode (after build)
NODE_ENV=production npm run start -w api
```

There are no automated tests in this project.

## Architecture

npm workspaces monorepo with two apps:

- `apps/api` — Express 5 + Prisma + PostgreSQL. ESM modules, TypeScript compiled via `tsc`. Entry: `src/index.ts`, app factory: `src/app.ts`.
- `apps/web` — React 19 SPA with Vite + Tailwind CSS 4. Entry: `src/main.tsx`, routing: `src/App.tsx`.

In production, the API serves the built SPA from `apps/web/dist` as a single-origin deployment.

### API structure (`apps/api/src/`)

| Path | Purpose |
|------|---------|
| `config/env.ts` | Zod-validated env vars; app crashes on startup if any required var is missing or invalid |
| `routes/index.ts` | Mounts all route groups under `/api/v1` |
| `middleware/authenticate.ts` | Reads JWT from `ac_access` cookie or `Authorization: Bearer` header, attaches `req.user` |
| `middleware/requireRole.ts` | RBAC guard; used after `authenticate` |
| `middleware/validate.ts` | Zod request validation middleware |
| `middleware/AppError.ts` | Typed error class; `errorHandler.ts` serializes it to `{ error: { code, message } }` |
| `lib/jwt.ts` | Sign/verify access tokens (short-lived, default 15m) |
| `lib/cookies.ts` | Cookie names (`ac_access`, `ac_refresh`) and helpers |
| `schemas/` | Zod schemas for request body validation, one file per domain |

Auth flow: login issues an httpOnly `ac_access` JWT + hashed opaque `ac_refresh` stored in DB. The refresh token rotates on each `/auth/refresh` call.

### Web structure (`apps/web/src/`)

| Path | Purpose |
|------|---------|
| `context/AuthContext.tsx` | Global auth state; bootstraps by calling `/auth/me` + refresh on mount |
| `lib/api.ts` | Axios instance with `withCredentials: true`; intercepts 401s to auto-refresh the session before retrying |
| `components/ProtectedRoute.tsx` | Redirects unauthenticated users to `/login` |
| `components/RoleGate.tsx` | Redirects users whose role isn't in the `allow` list |
| `components/AppShell.tsx` | Top-level layout wrapper (nav, outlet) |
| `pages/customer/` | CUSTOMER role views |
| `pages/staff/` | EMPLOYEE role views |
| `pages/admin/` | ADMIN role views |
| `types.ts` | Shared TypeScript types mirroring API response shapes |

Role-based routing is enforced in `App.tsx` by nesting routes inside `<RoleGate allow={[...]} />` components.

### Data model highlights

- `User` has roles: `CUSTOMER`, `EMPLOYEE`, `ADMIN`
- `Appointment` links a `Customer` → `Vehicle` → optional `assignedEmployee`
- `EmployeeAvailability` stores weekly windows as `(dayOfWeek, startMinute, endMinute)` in the shop's `SCHEDULING_TIMEZONE`
- `RefreshToken` stores a hashed token (not the raw value) with expiry
- All IDs are CUIDs

### Key env vars (API)

| Var | Note |
|-----|------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Must be ≥ 32 chars, must differ |
| `SCHEDULING_TIMEZONE` | IANA zone for employee availability windows (default `UTC`) |
| `APPOINTMENT_CHANGE_MIN_HOURS` | Cutoff for customer reschedule/cancel (default `24`) |
| `CORS_ORIGIN` | Must match the web app's origin in production |

Demo accounts (after seed) all use password `Demo12345!` — see README for the email list.
