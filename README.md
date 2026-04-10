<h1 align="center">
<img height="404" alt="Heimdall" align="center" src="https://github.com/user-attachments/assets/690de34e-0d27-4e2d-b1ce-2366e6ac1649" />  
</h1>
<h1 align="center">
Heimdall HTTP Approval Platform
</h1>
Heimdall is a secure, role-based HTTP Request Approval System built with Next.js 16. It acts as an intermediate governance layer for sensitive internal API requests, requiring designated approvers to vet payloads before they are physically executed on the backend network.

## 🌟 Core Features

- **Flexible Authentication**: Natively supports both legacy Active Directory / LDAP and modern Enterprise SSO (OpenID Connect via Google, Keycloak, Auth0) out-of-the-box using a simple `AUTH_MODE` toggle.
- **Role-Based Access Control (RBAC)**: Users are systematically classified strictly as `REQUESTER` or `APPROVER` dynamically via whitelist environment constraints.
- **Request Collections (Templates)**: High-density management of reusable request blueprints. Supports direct template creation, custom visibility (Global/Private), and full feature parity with the main dashboard (Auth, Params, Headers).
- **Granular Payload Construction**: Full GUI support for mapping URL search parameters, Header key-values (with dynamic Basic/Bearer Auth injection), and raw JSON bodies.
- **Audit Transparency**: Detailed audit trails for all request lifecycles. Rejections now capture `rejectedBy` and `rejectedAt` metadata for full accountability.
- **Structured JSON Logs**: A zero-dependency metadata flattening logger outputs strictly formatted non-nested JSON strings natively to `stdout`—perfect for Datadog, ELK, or Loki.
- **Request Cloning**: Easily clone and mutate existing/historical requests into new drafts natively from the dashboard.
- **Execution Telemetry**: Permanent attachment of raw response data and network latency (mapped via `performance.now()`) to executed tickets.

## 📷 Screenshots
<img height="1039" alt="Screenshot 2026-04-09 at 13 22 45" src="https://github.com/user-attachments/assets/3d5de97e-0c82-40bf-9d4f-c4670923b4f7" />
<img height="1039" alt="Screenshot 2026-04-09 at 13 22 55" src="https://github.com/user-attachments/assets/492434fb-d7b8-4a2b-b0f9-ec29f44b704d" />
<img height="1037" alt="Screenshot 2026-04-09 at 13 23 05" src="https://github.com/user-attachments/assets/b653c720-8eeb-4032-af72-92d234fb497d" />
<img height="1037" alt="Screenshot 2026-04-09 at 13 23 25" src="https://github.com/user-attachments/assets/a44887f3-6a00-4370-a6ea-2e2d0550afd8" />
<img height="1039" alt="Screenshot 2026-04-09 at 13 23 35" src="https://github.com/user-attachments/assets/41cf04fd-a928-4149-8e69-bd25cddbb9b7" />
<img height="1038" alt="Screenshot 2026-04-09 at 13 23 48" src="https://github.com/user-attachments/assets/b984fd26-52ac-484f-a222-66dfb56c3e05" />
<img height="1038" alt="Screenshot 2026-04-09 at 13 24 04" src="https://github.com/user-attachments/assets/a483b91c-6f2f-40c6-a1ba-ed9176024a97" />



## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router + React)
- **Styling**: Tailwind CSS 
- **Database**: Prisma ORM with SQLite backend (Easily swappable to Postgres/MySQL)
- **Authentication**: Dual-mode engine utilizing `ldap-authentication` for Active Directory and vanilla `fetch()` + `jose` for pure natively validated OAuth2 (OIDC) JSON Web Tokens.

## 🚀 QuickStart (Local Development)

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` (or create a `.env` file natively) and populate your database architecture alongside your AD/LDAP variables:
   ```env
   # Database Configuration
   DATABASE_URL="file:./dev.db"

   # Flexible Environment Toggles
   AUTH_MODE="LDAP"  # Choose strictly "LDAP" or "SSO"

   # LDAP / Authentication Configuration
   MOCK_LDAP="true"  # Set to false to bind to real LDAP instances
   LDAP_URL="ldap://your-server:389"
   LDAP_SEARCH_FILTER="(|(sAMAccountName=%s)(userPrincipalName=%s))"

   # OIDC Configuration (If AUTH_MODE="SSO")
   OAUTH_CLIENT_ID="your-client-id"
   OAUTH_CLIENT_SECRET="your-client-secret"
   OAUTH_AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth"
   OAUTH_TOKEN_URL="https://oauth2.googleapis.com/token"
   OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/callback"

   # Security Roles
   APPROVERS="admin,supervisor.name"
   ```

3. **Sync Database Architecture**
   ```bash
   npx prisma db push
   ```

4. **Launch Application**
   ```bash
   npm run dev
   ```

## 🐳 Docker Production Deployment

The repository contains a fully structured `Dockerfile` to seamlessly host the server on any infrastructure without local dependencies.

1. Build the container natively:
   ```bash
   docker build -t heimdall-platform .
   ```

2. Run the secure instance:
   ```bash
   docker run -p 3000:3000 --env-file .env -d heimdall-platform
   ```

## 🔒 Security Notes

- **Session Integrity**: The system securely manages stateless session cookies globally.
- **Environment Strictness**: Unless `FORCE_HTTPS=true` is set, development setups natively bypass the "Secure" flag on cookies allowing local infrastructure hosting across IP networks.
- **HMR Strictness**: Turbopack inherently isolates socket headers. If you are developing over a network, `next.config.ts` dynamically scans node hardware IP paths internally to allow hot-reloading anywhere on the VM array natively.
