# Heimdall Roadmap

## ✅ Short-term Goals (Completed)

- [x] **Flexible Authentication**: LDAP and SSO (OIDC) integration with `AUTH_MODE` toggle.
- [x] **Enhanced Auditing**: Structured JSON logging for audit trails + Inspection Detail lifecycle view (Operator / Verifier / Completion).
- [x] **Request Templating**: Collections management with Global/Private visibility.
- [x] **Pre-approval Modification**: Edit requests prior to final approval.
- [x] **Database Portability**: SQLite, MySQL, and PostgreSQL support via Prisma.
- [x] **UI Standardization**: Collections page aligned with Dashboard's premium glassmorphism design.
- [x] **Test Coverage**: 78 tests across API routes, components, and utilities (≥92% coverage).
- [x] **CI/CD Pipeline**: GitHub Actions with pre-commit checks, secret scanning (Gitleaks), and automated test/coverage reports.
- [x] **Contribution Guidelines**: CONTRIBUTING.md, issue templates, PR template, and pre-commit hooks.

## 🔄 In Progress

- [ ] **SSO Integration Testing**: End-to-end verification of the OIDC flow against Google, Keycloak, and Auth0.
- [ ] **MySQL Integration Testing**: Full integration test pass on MySQL backend.

## 📋 Long-term Goals

- [ ] **Threaded Discussions**: Conversation threads per request for centralized communication between requester and approver.
- [ ] **Task Automation**: Scheduler to execute approved requests automatically at defined intervals.
- [ ] **Heimdall CLI**: Command-line interface to submit, approve, and manage requests from the terminal.
- [ ] **Expanded Deployment Modes**: Native, Docker, Helm (Kubernetes), and Ansible playbook support.
- [ ] **Rejection Reason Field**: Allow approvers to attach a reason when rejecting a request, surfaced in the Inspector.

## 🐛 Resolved Bugs

- [x] Show password button on login page.
- [x] "No requests found" not centered on main page.
- [x] Approver could self-approve their own requests.
- [x] Missing tab badge counts in Inspection Detail.
- [x] Incorrect "Payload Result" label on request body view.
- [x] Button cursor not showing pointer on interactive elements.
