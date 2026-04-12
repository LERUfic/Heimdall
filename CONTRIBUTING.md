# Contributing to Heimdall

Thank you for your interest in contributing to **Heimdall HTTP Approval Platform**. This document outlines the standards and workflows required to contribute effectively.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Message Convention](#commit-message-convention)
- [Testing Requirements](#testing-requirements)
- [Linting & Code Style](#linting--code-style)
- [Pre-Commit Hooks](#pre-commit-hooks)
- [Pull Request Process](#pull-request-process)
- [Environment Variables](#environment-variables)

---

## Code of Conduct

This project follows our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold these standards.

---

## Project Overview

Heimdall is a **role-based HTTP Request Approval System** built on:

- **Next.js 16** (App Router, React 19)
- **Prisma ORM** (SQLite / MySQL / PostgreSQL)
- **Tailwind CSS v4**
- **Vitest** for unit and integration tests
- **ESLint** with TypeScript strict rules

Authentication is dual-mode: **LDAP/Active Directory** or **SSO (OIDC)**, toggled via `AUTH_MODE`.

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/<your-username>/heimdall.git
cd heimdall
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp env.example .env
# Fill in the required values (DATABASE_URL, AUTH_MODE, etc.)
```

### 4. Sync the Database

```bash
npx prisma db push
```

### 5. Install Pre-Commit Hooks

This project uses the [pre-commit](https://pre-commit.com/) framework. Install it once:

```bash
# macOS
brew install pre-commit

# or via pip
pip install pre-commit
```

Then activate the hooks in your local repo:

```bash
pre-commit install
```

From this point forward, `git commit` will automatically run lint and tests before every commit.

### 6. Run Development Server

```bash
npm run dev
```

---

## Development Workflow

1. Create a branch from `main` following the [branching strategy](#branching-strategy).
2. Make your changes. Ensure all new code has accompanying tests.
3. Run: `npm run lint && npm run test:coverage` before committing.
4. Open a Pull Request against `main`.

---

## Branching Strategy

| Branch Type     | Naming Convention                   | Example                          |
|-----------------|-------------------------------------|----------------------------------|
| Feature         | `feature/<short-description>`       | `feature/audit-trail-ui`         |
| Bug Fix         | `fix/<issue-number>-<description>`  | `fix/42-inspector-badge-count`   |
| Documentation   | `docs/<short-description>`          | `docs/contributing-guide`        |
| Refactor        | `refactor/<scope>`                  | `refactor/inspector-component`   |
| Test Coverage   | `test/<scope>`                      | `test/collections-error-path`    |
| Chore/Tooling   | `chore/<short-description>`         | `chore/pre-commit-hook`          |

> **Rule**: Never commit directly to `main`. All changes must go through a Pull Request.

---

## Commit Message Convention

This project uses **Conventional Commits**:

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #<issue-number>]
```

### Types

| Type       | When to use                                     |
|------------|-------------------------------------------------|
| `feat`     | New user-facing feature                         |
| `fix`      | Bug fix                                         |
| `refactor` | Code restructuring with no behavior change      |
| `test`     | Adding or fixing tests                          |
| `docs`     | Documentation only                              |
| `chore`    | Tooling, CI, dependency updates                 |
| `style`    | Formatting, whitespace, no logic change         |
| `perf`     | Performance improvement                         |

### Examples

```bash
feat(inspector): add audit trail metadata section
fix(collections): handle prisma creation error in POST route
test(collections): cover error path for failed collection creation
docs: add CONTRIBUTING.md and issue templates
chore: add pre-commit hook for lint and test
```

---

## Testing Requirements

All contributions **must** maintain or improve test coverage. The project targets:

- **≥ 90% Statement Coverage** across `src/`
- **≥ 80% Branch Coverage**

### Running Tests

```bash
# Run all tests in watch mode
npm run test

# Run with coverage report
npm run test:coverage
```

### Writing Tests

- Test files live in `__tests__/` and mirror the `src/` directory structure.
- API route tests go in `__tests__/api/`.
- Component tests go in `__tests__/components/`.
- Use `vitest-mock-extended` for typed Prisma mocks (see `__tests__/__mocks__/prisma.ts`).
- Mock `@/lib/auth` via `vi.mock()` — never use real session logic in tests.
- **Every new API route must have at least one test for the error path (500/401/400).**

---

## Linting & Code Style

```bash
npm run lint
```

The project enforces:

- **`@typescript-eslint/no-explicit-any`** — Use `as unknown as T` instead of `as any`.
- **`@typescript-eslint/no-unused-vars`** — Remove all unused imports before committing.
- **No inline `eslint-disable`** comments unless accompanied by a comment explaining why.

The pre-commit framework will block commits that fail linting. See [Pre-Commit Hooks](#pre-commit-hooks) for setup.

---

## Pre-Commit Hooks

This project uses [pre-commit.com](https://pre-commit.com/) — a framework for managing multi-language git hooks declaratively via `.pre-commit-config.yaml`.

### Hooks Configured

| Hook | Source | Purpose |
|---|---|---|
| `trailing-whitespace` | pre-commit/pre-commit-hooks | Remove trailing whitespace |
| `end-of-file-fixer` | pre-commit/pre-commit-hooks | Ensure files end with a newline |
| `check-merge-conflict` | pre-commit/pre-commit-hooks | Detect unresolved merge conflicts |
| `check-json` / `check-yaml` | pre-commit/pre-commit-hooks | Validate config file syntax |
| `detect-private-key` | pre-commit/pre-commit-hooks | Block raw RSA/SSH/PEM key commits |
| `gitleaks` | gitleaks/gitleaks | Scan for 600+ secret patterns (API keys, JWTs, tokens, connection strings, cloud credentials) |
| `eslint` | local | Run `npm run lint` |
| `vitest-coverage` | local | Run `npm run test:coverage` |

### Setup

```bash
# Install the pre-commit tool (once per machine)
brew install pre-commit   # macOS
pip install pre-commit    # or via pip

# Install hooks into this repo (once per clone)
pre-commit install
```

### Run Hooks Manually

```bash
# Run all hooks against all files
pre-commit run --all-files

# Run a specific hook
pre-commit run eslint --all-files
pre-commit run vitest-coverage --all-files

# Update hook versions to latest
pre-commit autoupdate
```

> Hooks also run automatically in CI via `.github/workflows/ci.yml`.

---

## Pull Request Process

1. Ensure `npm run lint` passes with **0 errors**.
2. Ensure `npm run test:coverage` passes with **all 77+ tests passing**.
3. Fill out the **Pull Request template** completely.
4. Link the relevant GitHub Issue in the PR description (`Closes #<N>`).
5. Request at least **1 reviewer** before merging.
6. Squash commits on merge for a clean history.

---

## Environment Variables

Never commit `.env` files. The `.gitignore` already excludes them. Refer to `env.example` for all required variables. Key variables:

| Variable           | Description                              |
|--------------------|------------------------------------------|
| `DATABASE_URL`     | Prisma connection string                 |
| `AUTH_MODE`        | `LDAP` or `SSO`                          |
| `MOCK_LDAP`        | `true` for local dev without an LDAP server |
| `APPROVERS`        | Comma-separated list of APPROVER usernames |
| `JWT_SECRET`       | Secret key for session token signing     |

For questions, open a [Discussion](https://github.com/LERUfic/Heimdall/discussions) or file an Issue using the appropriate template.
