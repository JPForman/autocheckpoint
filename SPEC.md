# AutoCheckpoint — Product Specification

## Overview

AutoCheckpoint is a web-based auto-shop appointment management system. It supports three user roles — **Customer**, **Employee**, and **Admin** — each with a tailored dashboard. Customers book service appointments for their vehicles, employees manage their schedules and assigned jobs, and admins oversee all users and shop analytics.

---

## Roles

| Role | Description |
|------|-------------|
| `CUSTOMER` | Default role on registration. Books appointments, manages vehicles and profile. |
| `EMPLOYEE` | Shop staff. Views all appointments, manages their weekly availability. Can be assigned to appointments. |
| `ADMIN` | Full access. User management, role changes, and analytics. Can also view/manage appointments and availability. |

---

## Authentication

- **Registration** — email + password (bcrypt hashed). All self-registered users start as `CUSTOMER`.
- **Login** — issues an httpOnly `ac_access` JWT (default 15m) and an httpOnly opaque `ac_refresh` cookie (default 7d). The refresh token is stored as a SHA-256 hash in the DB and rotates on every `/auth/refresh` call.
- **Refresh** — the web client auto-refreshes the session via an Axios interceptor on 401 responses.
- **Logout** — deletes the DB refresh token row and clears both cookies.
- **Forgot / Reset Password** — sends a time-limited email link (1h). The reset token is stored hashed; using it marks it `usedAt` and invalidates all existing refresh tokens for the user.
- Rate limiting: 30 req / 15 min on auth endpoints, 20 req / 15 min on login.

---

## Data Model

### User
- `id` (CUID), `email` (unique), `passwordHash`, `firstName`, `lastName`, `phone?`, `role`

### Vehicle _(CUSTOMER-owned)_
- `id`, `userId`, `make`, `model`, `year`, `vin?`, `licensePlate?`
- Cannot be deleted while it has any non-canceled appointment.

### Appointment
- `id`, `customerId`, `vehicleId`, `startsAt`, `endsAt`, `serviceType`, `status`, `notes?` (staff-only), `customerNotes?`, `assignedEmployeeId?`
- Statuses: `SCHEDULED` → `IN_PROGRESS` → `COMPLETED` / `CANCELED` / `NO_SHOW`
- Duration defaults to `DEFAULT_APPOINTMENT_DURATION_MINUTES` (env, default 60 min); staff can set a custom `endsAt`.
- No two appointments may overlap in time (shop-wide conflict check).

### EmployeeAvailability
- `employeeId`, `dayOfWeek` (0 = Sun), `startMinute`, `endMinute` — interpreted in `SCHEDULING_TIMEZONE` (IANA).
- Stored as a weekly template; replaced wholesale on `PUT /api/v1/availability`.

### RefreshToken / PasswordResetToken
- Both store only the hash, never the raw value.

---

## API — `/api/v1`

### Auth — `/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | — | Create account (CUSTOMER) |
| POST | `/login` | — | Authenticate, set cookies |
| POST | `/refresh` | cookie | Rotate refresh token |
| POST | `/logout` | JWT | Clear session |
| GET | `/me` | JWT | Return current user |
| POST | `/forgot-password` | — | Send reset email |
| POST | `/reset-password` | — | Apply new password via token |

### Appointments — `/appointments`

All routes require JWT. Customers see only their own appointments; staff (EMPLOYEE / ADMIN) see all.

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| GET | `/` | all | List appointments. Query: `from`, `to`, `status`. |
| POST | `/` | CUSTOMER | Book an appointment. Optional `assignedEmployeeId` validated against employee availability. |
| GET | `/employees` | all | List employees (id, name) for the assignment picker. |
| GET | `/:id` | all | Get single appointment. |
| PATCH | `/:id` | all | Update appointment. |

**PATCH rules:**
- Customers may reschedule or cancel only; must be ≥ `APPOINTMENT_CHANGE_MIN_HOURS` before `startsAt`.
- Staff may update `status`, `notes`, `startsAt/endsAt`, and `assignedEmployeeId`.
- Changing time on a canceled appointment is blocked.
- Assigning an employee validates their availability window for the slot.

### Vehicles — `/vehicles` _(CUSTOMER only)_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List own vehicles |
| POST | `/` | Add vehicle |
| PATCH | `/:id` | Update vehicle |
| DELETE | `/:id` | Delete vehicle (blocked if active appointments exist) |

### Availability — `/availability` _(EMPLOYEE / ADMIN)_

| Method | Path | Who | Description |
|--------|------|-----|-------------|
| GET | `/` | EMPLOYEE (own), ADMIN (any via `?employeeId=`) | Fetch weekly availability |
| PUT | `/` | EMPLOYEE (own), ADMIN (any via body `employeeId`) | Replace weekly availability |

### Admin — `/admin` _(ADMIN only)_

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | Paginated user list. Query: `page`, `pageSize`, `role`, `search`. |
| PATCH | `/users/:id` | Update user fields |
| PATCH | `/users/:id/role` | Change user role (cannot demote last admin) |
| GET | `/analytics/summary` | Appointments by status, upcoming count, total users. Query: `from`, `to`. |

---

## Web — Role-Based Pages

### Public
- `/` — Landing / home
- `/login` — Email + password login
- `/register` — Account creation
- `/forgot-password` — Request reset email
- `/reset-password` — Apply reset token from email link

### Customer (`/customer/*`)
- **Dashboard** — summary of upcoming appointments
- **Appointments** — list with filters; links to detail
- **Appointment Detail** — view, reschedule, cancel
- **New Appointment** — vehicle picker → date/time → service type → optional employee assignment
- **Vehicles** — CRUD vehicle garage
- **Profile** — edit name, phone

### Employee (`/staff/*`)
- **Appointments** — all shop appointments; assign self or change status
- **Availability** — weekly schedule editor (day + time ranges)

### Admin (`/admin/*`)
- **Users** — paginated table with search/filter; edit roles
- **Analytics** — appointment counts by status over a date range

---

## Scheduling Rules

1. **No slot overlap** — a new appointment is rejected if any existing non-canceled appointment overlaps `[startsAt, endsAt)`.
2. **Employee availability** — if `assignedEmployeeId` is set, the slot must fall within at least one of the employee's weekly availability windows. The check converts UTC timestamps to `SCHEDULING_TIMEZONE` to match the stored `(dayOfWeek, startMinute, endMinute)`.
3. **Customer change window** — customers cannot reschedule or cancel within `APPOINTMENT_CHANGE_MIN_HOURS` of the appointment start (default 24 h).
4. **Future-only booking** — `startsAt` must be strictly in the future.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | — | ≥ 32 chars; signs access tokens |
| `JWT_REFRESH_SECRET` | — | ≥ 32 chars; must differ from access secret |
| `ACCESS_TOKEN_TTL` | `15m` | Access JWT lifetime |
| `REFRESH_TOKEN_TTL` | `7d` | Refresh token lifetime |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor (10–15) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin |
| `FRONTEND_URL` | `http://localhost:5173` | Used in password-reset email links |
| `APPOINTMENT_CHANGE_MIN_HOURS` | `24` | Minimum hours before appointment for customer edits |
| `DEFAULT_APPOINTMENT_DURATION_MINUTES` | `60` | Duration applied when customer books (15–480) |
| `SCHEDULING_TIMEZONE` | `UTC` | IANA timezone for employee availability |
| `SMTP_HOST / PORT / SECURE / USER / PASS / FROM` | optional | Email delivery for password reset |

---

## Error Shape

All API errors return:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`.
