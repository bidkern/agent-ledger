# Security Architecture

## Core rule

No confidential customer material should ever be accessible through a public route, a public object URL, or a client-side secret.

That rule drives every product decision.

## Public vs private surface

Public routes:

- marketing site
- login page

Private routes:

- workspace
- customer data views
- upload flows
- evidence packages
- internal APIs and server actions

## Authentication and authorization

Current scaffold:

- signed `httpOnly` session cookie
- `sameSite=strict`
- server-side route protection with `requireSession()`
- auth re-check inside server actions

Production requirement before live customer data:

- SSO-capable auth provider such as WorkOS, Auth0, or Clerk
- MFA enforcement
- role-based access control
- SCIM for enterprise customers when needed

## Data access pattern

Use a dedicated server-only Data Access Layer.

Rules:

- no database or object-storage access from client components
- no secrets outside server-only modules
- return DTOs, never raw records, to UI boundaries
- re-authorize inside route handlers and server actions

## Document handling

Non-negotiables:

- object storage buckets remain private
- no public ACLs
- signed URLs expire quickly and only after policy checks
- malware scanning before storage or release
- envelope encryption and per-tenant key references in production

## AI-specific controls

- do not train public models on customer data by default
- redact or minimize sensitive data before sending to model providers
- maintain a model allowlist
- require human review for every external answer
- store prompt and answer audit trails
- defend against prompt injection in uploaded artifacts

## AppSec rules

- CSP enabled in deployment
- rate limiting on uploads and expensive mutations
- strict MIME and file-type validation
- audit logs for every document access
- Sentry or equivalent for alerting
- dependency scanning and routine penetration testing

## Operational security

- Delaware C corp with IP assignment and access agreements
- appropriate business liability and E&O insurance before meaningful scale
- incident response runbook
- vendor security review for all critical infra providers

## Architecture summary

The safest version of Agent Ledger is not a fully open automation app.
It is a narrow, server-first B2B workflow product where private actions are treated like internal systems and every share path is explicit, short-lived, and auditable.
