<p align="center">
<img width="195" height="404" alt="Heimdall" align="center" src="https://github.com/user-attachments/assets/690de34e-0d27-4e2d-b1ce-2366e6ac1649" />
</p>

# Heimdall HTTP Appro
val Platform

Heimdall is a secure, role-based HTTP Request Management and Execution platform built with Next.js 16. It acts as an intermediate approval layer for sensitive internal API requests, requiring designated approvers to vet payloads before they are physically executed on the backend network.

## 🌟 Core Features

- **Role-Based Access Control (RBAC)**: Deep Active Directory (LDAP) integration out-of-the-box. Users are systematically classified as `REQUESTER` or `APPROVER` dynamically via whitelist mapping.
- **Granular Payload Construction**: Full GUI support for mapping URL search parameters, Header key-values (with dynamic Basic/Bearer Auth injection), and raw JSON bodies.
- **Audit Trails**: Built-in comprehensive tracking for Request Creation, Approval, Rejection, and Execution phases with precise timestamps.
- **Request Cloning**: Easily clone and mutate existing/historical requests into new drafts natively from the dashboard.
- **Execution Telemetry**: Once an approved request is successfully executed by the server, the raw payload response and corresponding HTTP Status Codes are permanently attached to the ticket for post-mortem inspection.

## 📷 Screenshots
<img width="1800" height="1039" alt="Screenshot 2026-04-09 at 13 22 45" src="https://github.com/user-attachments/assets/3d5de97e-0c82-40bf-9d4f-c4670923b4f7" />
<img width="1799" height="1039" alt="Screenshot 2026-04-09 at 13 22 55" src="https://github.com/user-attachments/assets/492434fb-d7b8-4a2b-b0f9-ec29f44b704d" />
<img width="1800" height="1037" alt="Screenshot 2026-04-09 at 13 23 05" src="https://github.com/user-attachments/assets/b653c720-8eeb-4032-af72-92d234fb497d" />
<img width="1800" height="1037" alt="Screenshot 2026-04-09 at 13 23 25" src="https://github.com/user-attachments/assets/a44887f3-6a00-4370-a6ea-2e2d0550afd8" />
<img width="1800" height="1039" alt="Screenshot 2026-04-09 at 13 23 35" src="https://github.com/user-attachments/assets/41cf04fd-a928-4149-8e69-bd25cddbb9b7" />
<img width="1800" height="1038" alt="Screenshot 2026-04-09 at 13 23 48" src="https://github.com/user-attachments/assets/b984fd26-52ac-484f-a222-66dfb56c3e05" />
<img width="1800" height="1038" alt="Screenshot 2026-04-09 at 13 24 04" src="https://github.com/user-attachments/assets/a483b91c-6f2f-40c6-a1ba-ed9176024a97" />



## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router + React)
- **Styling**: Tailwind CSS 
- **Database**: Prisma ORM with SQLite backend (Easily swappable to Postgres/MySQL)
- **Authentication**: `ldap-authentication` for natively hooking into Active Directory / LDAP servers.

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

   # LDAP / Authentication Configuration
   MOCK_LDAP="true"  # Set to false to bind to real LDAP instances
   LDAP_URL="ldap://your-server:389"
   LDAP_SEARCH_FILTER="(|(sAMAccountName={{username}})(userPrincipalName={{username}}))"

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
