<h1 align="center">
<img height="200" alt="Heimdall" align="center" src="https://github.com/user-attachments/assets/690de34e-0d27-4e2d-b1ce-2366e6ac1649" />
</h1>
<h1 align="center">Heimdall HTTP Approval Platform</h1>

<p align="center">
  <a href="https://github.com/LERUfic/Heimdall/actions/workflows/ci.yml">
    <img src="https://github.com/LERUfic/Heimdall/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://codecov.io/gh/LERUfic/Heimdall">
    <img src="https://codecov.io/gh/LERUfic/Heimdall/graph/badge.svg" alt="Coverage" />
  </a>
  <img src="https://img.shields.io/badge/tests-78%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License" />
</p>

Heimdall is a secure, role-based HTTP Request Approval System built with Next.js 16. It acts as an intermediate governance layer for sensitive internal API requests, requiring designated approvers to vet payloads before they are physically executed on the backend network.

---

## 🌟 Core Features

- **Flexible Authentication**: Natively supports legacy Active Directory / LDAP and modern Enterprise SSO (OpenID Connect via Google, Keycloak, Auth0) using a simple `AUTH_MODE` toggle.
- **Role-Based Access Control (RBAC)**: Users are classified strictly as `REQUESTER` or `APPROVER` via whitelist environment constraints.
- **Request Collections (Blueprints)**: Full-featured management of reusable request templates with custom visibility (Global/Private), Auth injection, Params, and Headers. Fully aligned with the main dashboard's premium UI.
- **Granular Payload Construction**: Full GUI support for URL search parameters, header key-values (Basic/Bearer Auth injection), and raw JSON bodies.
- **Full Lifecycle Audit Trail**: The Inspection Detail panel surfaces the complete request lifecycle — **Operator** (who requested + when), **Verifier** (who approved/rejected + when), and **Completion** (execution timestamp and status).
- **Structured JSON Logs**: A zero-dependency logger outputs strictly formatted non-nested JSON to `stdout` — compatible with Datadog, ELK, and Loki.
- **Request Cloning**: Clone and mutate existing requests into new drafts directly from the dashboard.
- **Execution Telemetry**: Raw response data and network latency (via `performance.now()`) are permanently attached to executed requests.

---

## 📷 Screenshots

<img height="1039" alt="Dashboard" src="https://github.com/user-attachments/assets/3d5de97e-0c82-40bf-9d4f-c4670923b4f7" />
<img height="1039" alt="Inspection Detail" src="https://github.com/user-attachments/assets/492434fb-d7b8-4a2b-b0f9-ec29f44b704d" />
<img height="1037" alt="Request Collections" src="https://github.com/user-attachments/assets/b653c720-8eeb-4032-af72-92d234fb497d" />
<img height="1037" alt="Blueprint Construction" src="https://github.com/user-attachments/assets/a44887f3-6a00-4370-a6ea-2e2d0550afd8" />
<img height="1039" alt="Approval Flow" src="https://github.com/user-attachments/assets/41cf04fd-a928-4149-8e69-bd25cddbb9b7" />
<img height="1038" alt="Execution Result" src="https://github.com/user-attachments/assets/b984fd26-52ac-484f-a222-66dfb56c3e05" />
<img height="1038" alt="Login" src="https://github.com/user-attachments/assets/a483b91c-6f2f-40c6-a1ba-ed9176024a97" />

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router + React 19) |
| Styling | Tailwind CSS v4 |
| Database | Prisma ORM — SQLite / MySQL / PostgreSQL |
| Authentication | `ldap-authentication` (LDAP/AD) + `jose` (OIDC/JWT) |
| Testing | Vitest + Testing Library (78 tests, ≥92% coverage) |
| CI/CD | GitHub Actions — Pre-Commit checks + Coverage reports |
| Secret Scanning | Gitleaks (600+ patterns) |

---

## 🚀 QuickStart (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp env.example .env
```

Fill in the required values:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth mode: "LDAP" or "SSO"
AUTH_MODE="LDAP"
MOCK_LDAP="true"           # Set false to bind to a real LDAP server
LDAP_URL="ldap://your-server:389"
LDAP_SEARCH_FILTER="(|(sAMAccountName=%s)(userPrincipalName=%s))"

# SSO / OIDC (only if AUTH_MODE="SSO")
OAUTH_CLIENT_ID="your-client-id"
OAUTH_CLIENT_SECRET="your-client-secret"
OAUTH_AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth"
OAUTH_TOKEN_URL="https://oauth2.googleapis.com/token"
OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/callback"

# Role control — comma-separated approver usernames
APPROVERS="admin,supervisor.name"
```

### 3. Sync Database

```bash
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

---

## 🗄️ Database Portability

Heimdall defaults to SQLite for zero-config local development, but supports MySQL and PostgreSQL for production.

### Switch to MySQL or PostgreSQL

```bash
npm run db:mysql     # Switch to MySQL
npm run db:postgres  # Switch to PostgreSQL
```

Update `DATABASE_URL` in `.env`, then apply the schema:

```bash
npx prisma migrate dev --name init
```

### Switch back to SQLite

```bash
npm run db:sqlite
```

Update `DATABASE_URL` to `file:./dev.db`, then sync:

```bash
npx prisma db push
```

---

## 🐳 Docker Production Deployment

```bash
# Build (SQLite — default)
docker build -t heimdall-platform .

# Build (MySQL)
docker build -t heimdall-platform --build-arg DATABASE_PROVIDER=mysql .

# Run
docker run -p 3000:3000 --env-file .env -d heimdall-platform
```

---

## 🧪 Testing

```bash
npm run test             # Watch mode
npm run test:coverage    # Full coverage report
```

The test suite covers **API routes**, **React components**, and **utility functions** with a target of ≥90% statement coverage and ≥80% branch coverage.

---

## 🔧 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

Key requirements:
- Follow the **Conventional Commits** format (`feat:`, `fix:`, `test:`, etc.)
- All PRs must pass `npm run lint` with 0 errors and `npm run test:coverage` with all tests passing
- Install the [pre-commit](https://pre-commit.com/) hooks before committing:

```bash
brew install pre-commit gitleaks
pre-commit install
```

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) or [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) templates for issues.

---

## 🔒 Security Notes

- **Session Integrity**: Stateless session cookies are managed securely on every request.
- **Secret Scanning**: [Gitleaks](https://github.com/gitleaks/gitleaks) scans every commit via pre-commit hooks and the CI pipeline, blocking 600+ known secret patterns before they reach the repository.
- **Environment Strictness**: Unless `FORCE_HTTPS=true` is set, development setups bypass the `Secure` cookie flag to allow local/network hosting during development.
- **HMR Strictness**: If developing over a network, `next.config.ts` dynamically resolves local IPs to allow Turbopack hot-reloading across VM arrays.
