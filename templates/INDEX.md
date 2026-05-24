# INDEX.md — Project map

> The live map of this repo. Update it when packages, entry points, or
> responsibilities change. Stops agents from blind grep-ing.

## Packages / apps

| Path | Kind | Responsibility | Entry point |
|------|------|----------------|-------------|
| `apps/web` | app | <user-facing UI> | `apps/web/src/main.tsx` |
| `apps/api` | service | <HTTP API> | `apps/api/src/server.ts` |
| `packages/core` | lib | <domain logic> | `packages/core/src/index.ts` |
| `packages/ui` | lib | <design system> | `packages/ui/src/index.ts` |

## Inter-module dependencies

```
apps/web   ──► packages/ui ──► packages/core
apps/api   ──► packages/core
```

## Where things live

- **Domain logic:** `packages/core/src/<area>/`
- **HTTP routes:** `apps/api/src/routes/`
- **UI components:** `packages/ui/src/components/`
- **Database migrations:** `apps/api/migrations/`
- **Shared types:** `packages/core/src/types/`
- **Tests:** colocated as `*.test.ts` next to source.

## External services
- `<name>` — <what we use it for> — credentials via `<env var>`

## Build / test entry commands
- Build all: `<command>`
- Test all: `<command>`
- Run web locally: `<command>`
- Run api locally: `<command>`
