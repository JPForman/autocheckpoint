# AutoCheckpoint

Full-stack auto care scheduling app using the following: **React (Vite) + Tailwind** frontend, **Node.js (Express) + Prisma + PostgreSQL** API, **JWT** auth via **httpOnly cookies** with refresh rotation, and **RBAC** (`CUSTOMER`, `EMPLOYEE`, `ADMIN`).

## Live Instance
https://autocheckin-500123-45cf9.web.app/

## Features

**Authentication**
- Email/password registration and login, httpOnly JWT + rotating refresh cookies
- Forgot/reset password via time-limited emailed link
- Auto session refresh on 401 (Axios interceptor)

**Customer**
- Book, reschedule, and cancel appointments (list or calendar view)
- Vehicle garage (CRUD), optional employee assignment at booking
- Request tow jobs and track pickup/destination and live tow location
- Edit profile (name, phone)

**Employee**
- View and manage all shop appointments; self-assign, update status/notes
- Weekly availability editor (day + time-range windows)
- Manage tow jobs: create, update status, post live location updates

**Admin**
- Everything employees can do, plus:
- Paginated user directory with search/filter and role management
- Shop analytics (appointments by status, upcoming count, total users)

**Scheduling rules**
- No overlapping appointments shop-wide
- Employee assignment validated against their availability windows
- Customer reschedule/cancel blocked within `APPOINTMENT_CHANGE_MIN_HOURS` of start
- Future-only booking

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ (local or Docker)

## Quick start (local)

1. **Start PostgreSQL** (example with Docker):

   ```bash
   docker compose up -d postgres
   ```

2. **Environment**

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

   Edit `apps/api/.env`: set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to different random strings **at least 32 characters** each.

3. **Install & database**

   ```bash
   npm install
   cd apps/api && npx prisma migrate deploy && npx prisma db seed && cd ../..
   ```

   For active development you can use `npx prisma migrate dev` instead of `deploy`.

4. **Run**

   ```bash
   npm run dev
   ```

   - Web: [http://localhost:5173](http://localhost:5173) (proxies `/api` to the API)
   - API: [http://localhost:4000](http://localhost:4000)
   - OpenAPI UI (non-production only): [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

## Demo accounts (seed)

After `npm run db:seed -w api`, all seeded users share password **`Demo12345!`**:

| Role     | Email                       |
|----------|-----------------------------|
| Admin    | `admin@autocheckpoint.local` |
| Employee | `morgan@autocheckpoint.local`, `jamie@autocheckpoint.local` |
| Customer | `chris@example.com`, `dana@example.com` |

## Production build

```bash
npm run build
NODE_ENV=production node apps/api/dist/index.js
```

With `NODE_ENV=production`, the API serves the built SPA from `apps/web/dist` when that folder exists (same process, single origin).

## Docker (API + Postgres)

From the repo root:

```bash
export JWT_ACCESS_SECRET='replace-with-32-plus-char-secret-for-access-token'
export JWT_REFRESH_SECRET='replace-with-32-plus-char-secret-for-refresh-token'
docker compose up --build api
```

The `api` image runs `prisma migrate deploy` on startup, then starts the server on port `4000`. Adjust `CORS_ORIGIN` / `FRONTEND_URL` for your deployed web origin.

## Architecture notes

- **API base path:** `/api/v1`
- **Cookies:** `ac_access` (JWT), `ac_refresh` (opaque, stored hashed server-side)
- **Customer rules:** reschedule/cancel only before `APPOINTMENT_CHANGE_MIN_HOURS` (default 24) from the scheduled start; see `apps/api/.env.example`
- **Availability:** `SCHEDULING_TIMEZONE` (IANA, default `UTC`) defines how stored weekly windows map to real instants; set it to your shop’s zone in `apps/api/.env`

## Project layout

- [`apps/web`](apps/web) — React SPA
- [`apps/api`](apps/api) — Express API, Prisma schema, migrations, OpenAPI spec (`apps/api/docs/openapi.yaml`)

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | API + Vite dev servers |
| `npm run build` | Build web + API |
| `npm run start -w api` | Run compiled API (`NODE_ENV` should be set) |
| `npm run db:migrate -w api` | `prisma migrate deploy` |
| `npm run db:seed -w api` | Run seed script |
