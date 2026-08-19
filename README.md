# Job Portal

Full-stack MERN job portal with separate candidate, recruiter, and admin experiences.
The repository contains two React/Vite frontends and one Express/MongoDB backend:

- `frontend/`: public candidate and recruiter application.
- `admin-panel/`: separate admin application with its own login and token storage.
- `backend/`: REST API, Socket.IO server, authentication, payments, uploads, cron jobs, and admin APIs.

This README is the onboarding and operations guide for developers working on the project.

## Quick Start

Requirements:

- Node.js 18+ recommended.
- npm 9+ recommended.
- A reachable MongoDB database.
- Razorpay, Cloudinary, Twilio, and SMTP credentials for the features that use them.

Install dependencies in each application:

```powershell
cd backend; npm install
cd ..\frontend; npm install
cd ..\admin-panel; npm install
```

Start each process in a separate terminal:

```powershell
# Terminal 1
cd backend; npm run dev

# Terminal 2
cd frontend; npm run dev

# Terminal 3
cd admin-panel; npm run dev
```

Default local URLs:

| Service | URL |
|---|---|
| Backend health | `http://localhost:5000/health` |
| Public API | `http://localhost:5000/api` |
| Admin API | `http://localhost:5000/admin-api` |
| Socket.IO | `ws://localhost:5000` |
| Public frontend | `http://localhost:3000` |
| Admin panel | `http://localhost:3001` |

## Repository Layout

```text
updated-job-portal-main/
├── backend/
│   ├── server.js                 # HTTP + Socket.IO startup
│   ├── seedAdmin.js              # Create an admin from the CLI
│   ├── src/
│   │   ├── app.js                # Express middleware and route mounting
│   │   ├── config/               # Database, payment, storage, mail, socket config
│   │   ├── controllers/          # Public and admin request handlers
│   │   ├── jobs/                 # Scheduled cron jobs
│   │   ├── middleware/           # Auth, roles, rate limits, uploads
│   │   ├── models/               # Mongoose models
│   │   ├── routes/               # Public and admin route definitions
│   │   ├── services/             # Email and other reusable services
│   │   └── utils/                # Shared helpers
│   └── uploads/                  # Local upload fallback/storage directory
├── frontend/
│   ├── src/api/                  # Public Axios client
│   ├── src/components/           # Shared UI and auth components
│   ├── src/context/              # Candidate/recruiter auth state
│   ├── src/pages/candidate/      # Candidate workspace
│   ├── src/pages/recruiter/      # Recruiter workspace
│   ├── src/routes/               # Role-protected routes
│   └── src/socket.js             # Shared Socket.IO client
├── admin-panel/
│   └── src/
│       ├── api/                  # Admin-only Axios client
│       ├── components/           # Admin layout and navigation
│       ├── context/              # Admin auth state
│       ├── pages/                # Dashboard, users, jobs, finance, etc.
│       └── routes/               # Admin protected route
└── README.md
```

## Environment Configuration

The repository currently uses local `.env` files. Never commit real credentials. Create local files from the variable list below, or copy them from your deployment secret manager.

### `backend/.env`

```dotenv
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/job-portal
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
ADMIN_JWT_SECRET=replace-with-a-different-long-random-secret
ADMIN_JWT_EXPIRES_IN=30m
PUBLIC_FRONTEND_URL=http://localhost:3000
ADMIN_FRONTEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
RAZORPAY_KEY_ID=replace-me
RAZORPAY_KEY_SECRET=replace-me
EMAIL_USER=replace-me
EMAIL_APP_PASSWORD=replace-me
CLOUDINARY_CLOUD_NAME=replace-me
CLOUDINARY_API_KEY=replace-me
CLOUDINARY_API_SECRET=replace-me
```

Other optional or deployment-specific variables referenced by the backend include `ADMIN_IP_WHITELIST`, `PRICE_CANDIDATE_REGISTRATION`, `PRICE_RECRUITER_REGISTRATION`, `PRICE_RESUME_DOWNLOAD`, and Twilio variables `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Storage configuration may also use Cloudflare R2 variables through `backend/src/config/cloudflareR2.js`.

### `frontend/.env`

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

The public Axios client stores the user token under `localStorage.token` and only talks to `/api`.

### `admin-panel/.env`

```dotenv
VITE_ADMIN_API_BASE_URL=http://localhost:5000/admin-api
```

The admin Axios client stores the admin token under `localStorage.admin_token` and only talks to `/admin-api`. If this variable is missing, the admin client falls back to the local admin API URL.

## Backend Architecture

`backend/server.js` loads environment variables, connects to MongoDB, starts cron jobs, creates the HTTP server, and attaches Socket.IO. `backend/src/app.js` configures Helmet, CORS, Morgan logging, JSON parsing, static uploads, rate limiting, route mounting, and error handling.

### API namespaces

Public routes are mounted below `/api`:

- `/api/candidate`
- `/api/profile`
- `/api/recruiter`
- `/api/jobs`
- `/api/companies`
- `/api/applications`
- `/api/payments`
- `/api/messages`
- `/api/otp`
- `/api/referral`
- `/api/notifications`

Admin routes are mounted below `/admin-api` and are not imported by the public frontend. Admin login is available at `/admin-api/auth/login`; the remaining admin routes require `requireAdmin` and the admin JWT.

### Admin route groups

The admin API currently covers:

- Dashboard overview statistics.
- Candidate and recruiter listing, profiles, status changes, verification, notes, documents, wallet adjustments, and analytics.
- Payment listing and payment details.
- Job listing, job details, status changes, deletion, applications, and reopen requests.
- Hired badge approval/rejection.
- Dispute listing, details, and resolution.

See `backend/src/routes/admin.routes.js` for the authoritative route list and controller mapping.

## Authentication and Security

- Candidate/recruiter tokens use `JWT_SECRET`.
- Admin tokens use a separate `ADMIN_JWT_SECRET`.
- Public and admin clients use separate localStorage keys: `token` and `admin_token`.
- Admin login has a stricter rate limiter.
- Admin API requests use an additional admin API limiter.
- `ADMIN_IP_WHITELIST` can restrict admin access by IP in deployments that need it.
- Helmet and CORS are enabled in the backend.
- Public account suspension/ban responses clear the public session.
- Admin suspension/ban responses clear the admin session and redirect to login.
- State-changing admin operations are designed to be auditable through `AdminAuditLog`.

Do not expose `JWT_SECRET`, `ADMIN_JWT_SECRET`, Razorpay secrets, SMTP passwords, Cloudinary secrets, or Twilio tokens in frontend `.env` files. Vite variables are bundled into browser code.

## Main Product Workflows

### Candidates

- Register and authenticate.
- Verify identity/OTP and recover an ID when needed.
- Build a profile and resume.
- Search, save, and apply to jobs.
- Track applications and recommendations.
- Message recruiters in real time.
- Manage settings and notifications.

### Recruiters

- Register a recruiter/company account.
- Maintain company and recruiter profiles.
- Create, update, close, and manage job postings.
- Review applicants and update application status.
- Send invitations and messages.
- Download candidate resumes where permitted.
- Use wallet and payment flows.
- Upload offer letters and participate in the hired badge flow.

### Admins

- Sign in through the separate admin panel.
- Monitor dashboard activity and notifications.
- Review candidate/recruiter accounts, verification, status, documents, and notes.
- Manage jobs, applicants, disputes, payments, badges, and reopen requests.
- Adjust recruiter wallets where authorized.
- Review audit-sensitive actions.

## Database Models

The main Mongoose models are:

| Model | Purpose |
|---|---|
| `Candidate` | Candidate account, profile, resume, and status data |
| `Recruiter` | Recruiter/company account and verification data |
| `Job` | Job postings and lifecycle/status data |
| `Application` | Candidate applications and hiring status |
| `Payment` | Payment/order and gateway-related records |
| `Wallet` | Recruiter wallet balances and ledger activity |
| `Message` | Candidate/recruiter conversations |
| `Notification` | User notifications |
| `OfferLetter` | Offer-letter and hired badge workflow |
| `Dispute` | Payment or platform dispute records |
| `JobReopenRequest` | Recruiter requests to reopen admin-closed jobs |
| `Admin` | Admin accounts and roles |
| `AdminAuditLog` | Admin action history |
| `PendingCandidateRegistration` | Registration/payment staging data |

Before changing a schema, check all controllers, services, frontend field names, and existing seed/migration scripts that consume it.

## Frontend Conventions

Both frontends are React 18 + Vite + Tailwind CSS v4 applications.

- Use the existing Axios instance instead of creating ad-hoc clients.
- Keep public requests on `frontend/src/api/axiosInstance.js`.
- Keep admin requests on `admin-panel/src/api/adminAxiosInstance.js`.
- Preserve role-protected route behavior when adding pages.
- Use the existing Tailwind color language and local component patterns before introducing new styles.
- Keep wide tables inside `overflow-x-auto` containers and add `min-w-0` to flex children that contain them.
- Keep mobile table content readable; do not add ellipsis truncation when the user needs the full value.
- Reuse existing Lucide icons, loading states, empty states, and modal patterns.

### Public frontend routes

The public app contains separate candidate and recruiter workspaces. Route ownership is enforced through route components and auth context; inspect `frontend/src/routes/` and `frontend/src/App.jsx` before adding a route.

### Admin panel pages

The admin panel includes dashboard, recruiters, candidates, jobs, applications, job details/applicants, payments/account, reports, settings, disputes, badge approvals, and reopen requests. `AdminLayout.jsx` owns the sidebar, mobile drawer, header, notifications, and the nested `<Outlet />` content area.

## Real-time Features

Socket.IO shares the backend HTTP port. The public frontend derives the socket origin from `VITE_API_BASE_URL` by removing the `/api` suffix. The client connects after authentication and is used for notifications and messaging. When changing socket events, update both the backend emitter and every frontend listener, and clean up listeners on component unmount.

## Scheduled Jobs

`backend/server.js` starts these cron jobs after the database connection succeeds:

- `renewalReminder.cron.js`: renewal reminder processing.
- `accountSuspension.cron.js`: account suspension checks.
- `walletCleanup.cron.js`: wallet cleanup processing.

Cron behavior should be reviewed before running multiple backend replicas, because duplicate workers can process the same scheduled task unless deployment-level coordination is added.

## Payments and Uploads

Razorpay integration is configured in `backend/src/config/razorpay.js` and used by payment, wallet, and registration flows. Development mode can use fallback behavior when Razorpay is not configured; production must provide valid keys and verify signatures server-side.

Cloudinary and Cloudflare R2 configuration files exist for media/file storage. Upload handling is centralized through upload middleware and services. Confirm the selected storage provider and retention policy before deploying production uploads.

## Available Commands

### Backend

```powershell
npm run dev       # nodemon server.js
npm start         # node server.js
npm run seed:admin
```

The admin seed command accepts the arguments used by `backend/seedAdmin.js`; run `node seedAdmin.js` without arguments to inspect its validation/help behavior before creating an account.

### Frontend and admin panel

```powershell
npm run dev       # Vite development server
npm run build     # Production build
npm run preview   # Preview the production build locally
```

Run these commands separately inside `frontend/` and `admin-panel/`.

## Testing and Verification Checklist

There is no single root-level test script. For a change, use the narrowest available checks:

1. Run editor diagnostics on touched files.
2. Run `npm run build` in the affected frontend.
3. Start the backend and verify `GET /health` returns `{ "status": "ok" }`.
4. Test the affected API with an authenticated and unauthenticated request.
5. Test public and admin login separately; confirm tokens do not mix.
6. Check desktop and mobile layouts, especially wide tables, modals, date inputs, and drawers.
7. For payment changes, test success, failure, pending, refund, and signature-verification paths.
8. For scheduled jobs, verify behavior with a controlled database record before enabling production schedules.

## Deployment Checklist

- Set `NODE_ENV=production`.
- Use strong, different JWT secrets for public and admin tokens.
- Configure production MongoDB with backups and least-privilege credentials.
- Set exact production `PUBLIC_FRONTEND_URL` and `ADMIN_FRONTEND_URL` values.
- Set `VITE_API_BASE_URL` and `VITE_ADMIN_API_BASE_URL` at build time.
- Use production Razorpay keys and webhook/signature verification.
- Configure Cloudinary/R2, SMTP, and Twilio credentials as required.
- Keep `.env` files and uploads outside version control.
- Deploy the admin panel separately, ideally behind VPN or an IP allowlist.
- Configure HTTPS for all browser-facing URLs and Socket.IO.
- Configure a process manager, logs, health checks, and restart policy for the backend.
- Ensure only one coordinated cron worker runs scheduled jobs.
- Review CORS and rate-limit behavior after changing domains or proxies.

## Known Gaps and Maintenance Notes

- Some finance/admin presentation data is still mock or fallback data; verify API mapping before treating dashboards as financial source of truth.
- Excel and PDF export paths may be UI placeholders depending on the current page implementation.
- Some email flows depend on SMTP configuration and may log or fall back in development.
- Production deployment files such as Docker, Nginx, and CI/CD configuration are not standardized in this repository.
- The local `.env` files contain environment-specific configuration and must be treated as sensitive.
- API response shapes are consumed directly by several pages; update backend and frontend together when renaming fields.

## Troubleshooting

### CORS error

Confirm the browser origin exactly matches `PUBLIC_FRONTEND_URL` or `ADMIN_FRONTEND_URL`, including protocol and port. In development, loopback origins are also accepted.

### Admin requests return 401

Confirm the admin panel uses `VITE_ADMIN_API_BASE_URL`, the backend is running, the admin token is stored as `admin_token`, and the account was created with `seedAdmin.js`.

### Public requests return 401/403

Check `VITE_API_BASE_URL`, the public `token`, JWT expiry, and account status. A suspended or banned account is intentionally logged out by the Axios interceptor.

### Database connection fails

Check `MONGO_URI`, DNS/network access, MongoDB user permissions, and whether the database allows the current IP. Backend startup waits for the database connection before listening.

### Upload or payment fails

Check the relevant provider variables, file size/type middleware, server logs, and whether the frontend is calling the correct public API base URL. Never debug by logging secret values.

## Change Workflow for Developers

1. Identify the owning route/controller/model or page before editing.
2. Read the neighboring implementation and its API response shape.
3. Make the smallest focused change.
4. Run diagnostics and the affected build.
5. Test the user workflow, including the mobile layout if UI changed.
6. Update this README when setup, environment variables, routes, or deployment behavior changes.

## Reference Documents

The repository also contains focused notes such as `TESTING_GUIDE.md`, `EMAIL_FIX_SUMMARY.md`, `LANGUAGES_TEST.md`, and `RECRUITER_PROFILE_SETUP.md`. Read the relevant note before changing the workflow it documents. If the original product specification PDF is present in your checkout, use it as a product reference, but treat the current route/model code as the implementation source of truth.
