# Job Portal Website

Full-stack job portal (MERN) with a **separate, unlisted admin panel**, matching
the architecture described in `Job_Portal_Documentation_pdf.pdf`.

## Project structure

```
job-portal/
├── backend/        Express + MongoDB API. Serves BOTH /api (public) and /admin-api (admin).
├── frontend/        Public site for job seekers & recruiters. No admin link anywhere.
└── admin-panel/     Separate React app for admins. Deployed to its own subdomain.
```

## Why the admin panel is separate

- **No admin button on the public site.** `admin-panel/` is a different app entirely,
  built and deployed independently (e.g. `admin.yourdomain.com`), so there's nothing
  to find in the public bundle.
- **Different JWT secret.** Admin tokens are signed with `ADMIN_JWT_SECRET`, not
  `JWT_SECRET`. A leaked candidate/recruiter token can never be replayed against
  `/admin-api`.
- **No self-service admin registration.** The only way to create an admin account is
  running `backend/seedAdmin.js` directly on the server (CLI/SSH access required).
- **Stricter protections on `/admin-api`:** tighter rate limiting on login, optional
  IP whitelist (`ADMIN_IP_WHITELIST` in `.env`), shorter token expiry, and every
  state-changing action is written to `AdminAuditLog`.

## Getting started

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # already provided as .env — fill in real credentials
npm run dev
```

Then create your first admin account (only way to do this):

```bash
node seedAdmin.js "Kishan Raj Patel" admin@jkrbim.com "aStrongPassword123" superadmin
```

Backend runs on `http://localhost:5000`:
- Public API: `http://localhost:5000/api`
- Admin API: `http://localhost:5000/admin-api`

### 2. Public frontend (job seekers + recruiters)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

### 3. Admin panel

```bash
cd admin-panel
npm install
npm run dev
```

Runs on `http://localhost:3001` — a completely separate app, separate login page,
separate token storage. In production this should be deployed to its own subdomain
(e.g. `admin.yourdomain.com`) and, ideally, restricted to your office network/VPN or
an IP allowlist via `ADMIN_IP_WHITELIST`.

## Environment variables to fill in before going live

| File | What to set |
|---|---|
| `backend/.env` | `MONGO_URI`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, Cloudflare R2 keys, Razorpay keys, Twilio keys |
| `frontend/.env` | `VITE_API_BASE_URL` (production API URL) |
| `admin-panel/.env` | `VITE_ADMIN_API_BASE_URL` (production admin API URL) |

## What's implemented as working code vs. stubs

**Fully wired:** registration, login (candidate/recruiter/admin), unique ID generation,
OTP-based ID recovery, job posting/search, applications, offer letter upload → Hired
badge flow, recruiter-initiated messaging, Razorpay order creation + verification,
admin dashboard stats, user suspension, badge approval, disputes, audit logging, daily
cron jobs for renewal reminders and account suspension.

**Left as TODOs / next steps:** resume file upload UI on the candidate profile page,
actual payment UI flow wired into the Rs. 11 resume-download button, email provider
integration (currently just logs to console), and production deployment configs
(Dockerfiles, nginx, CI/CD).

## Reference

See `Job_Portal_Documentation_pdf.pdf` (Sections 5–9) for the full feature spec,
flow charts, database design, and week-by-week build timeline this code follows.
