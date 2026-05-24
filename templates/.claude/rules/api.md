---
paths:
  - "apps/api/**"
  - "packages/*/src/**"
  - "**/routes/**"
  - "**/*.server.ts"
---

# API & backend rules

> Loaded when you touch backend code. Keep frontend concerns out of here.
> Customize the `paths:` globs above to match this repo's layout.

## Boundaries
- Validate at the edge. Every request body, query param, and header is untrusted
  until parsed by a schema (`<zod | valibot | pydantic | …>`). No raw `req.body`.
- Domain logic lives in `<packages/core>`, not in route handlers. Routes wire
  HTTP ↔ domain; they don't contain business rules.
- Return typed errors, not thrown strings. One error shape across the API.

## Data & persistence
- All queries go through `<repository | data-access layer>`. No SQL in handlers.
- Migrations are append-only and reversible. Never edit a shipped migration.
- Wrap multi-write operations in a transaction. Partial writes are bugs.

## Security
- Never log secrets, tokens, or full request bodies on auth routes.
- AuthZ is checked per-resource, not just per-route. "Logged in" ≠ "allowed".
- Rate-limit public endpoints. Default-deny on anything that mutates state.

## Tests
- Every endpoint ships with a test covering: happy path, invalid input (400),
  and unauthorized access (401/403).
- Test the contract (status code + body shape), not the implementation.
