# Hermium

Self-hosted AI chat dashboard — a port of [Hermes Web UI](https://github.com/EKKOLearnAI/hermes-web-ui) into a modern TanStack Start + Hono + Bun monorepo.

## Architecture

```
Browser → TanStack Start (:3000) → Hono BFF (:8648) → Hermes Gateway (:8642)
                ↓                              ↓
           Zustand stores               SQLite (bun:sqlite)
           File-based routes             Proxy + SSE interception
           shadcn/ui (base-nova)         WebSocket / Socket.IO ready
```

## Packages

| Package | Role | Mirrors Hermes |
|---------|------|----------------|
| `packages/web` | TanStack Start SPA | `packages/client` (Vue → React) |
| `packages/api` | Hono BFF server | `packages/server` (Koa → Hono) |
| `packages/shared` | Shared types/schemas | New (replaces ad-hoc types) |

## Quick Start

```bash
# Install everything (Bun workspaces)
bun install

# Dev — runs both servers with concurrently
bun run dev

# Or individually
bun run dev:api    # Hono API on :8648
bun run dev:web    # TanStack Start on :3000 (proxies /api → :8648)
```

### API
```bash
cd packages/api
bun run dev        # hot reload with bun --hot
bun run build      # bun build → dist/
bun run start      # bun dist/index.js
```

### Web
```bash
cd packages/web
bun run dev        # Vite dev server on :3000
bun run build      # vite build
bun run typecheck  # tsc --noEmit
```

## Hermes-Web-UI → Hermium Mapping

| Hermes (Vue/Koa) | Hermium (React/Hono) | Notes |
|------------------|----------------------|-------|
| `src/api/client.ts` | `packages/web/src/api/client.ts` | fetch wrapper, auth token, profile header |
| `src/api/hermes/*` | `packages/web/src/api/hermes/*` | domain APIs: chat, sessions, files, models |
| `src/stores/hermes/*` | `packages/web/src/stores/*` | Zustand stores (app, chat) |
| `src/components/hermes/*` | `packages/web/src/components/hermes/*` | feature components |
| `src/routes/index.ts` | file-based `src/routes/*.tsx` | TanStack Router file routes |
| `src/index.ts` bootstrap | `packages/api/src/index.ts` | Hono + Bun.serve |
| `src/routes/index.ts` | `packages/api/src/routes/index.ts` | route registrar (public → auth → protected → proxy) |
| `src/controllers/*` | `packages/api/src/controllers/*` | thin request handlers |
| `src/services/*` | `packages/api/src/services/*` | auth, gateway manager |
| `src/db/hermes/*` | `packages/api/src/db/*` | SQLite schemas + bun:sqlite |
| `src/middleware/*` | `packages/api/src/middleware/*` | auth, cors, request logger |
| `src/lib/*` | `packages/api/src/lib/*` | utils, logger |
| `vite.config.ts` proxy | `packages/web/vite.config.ts` proxy | `/api`, `/upload`, `/health` → :8648 |

## Key Differences

- **Database**: `better-sqlite3` → `bun:sqlite` (native, faster, zero deps)
- **Server**: Koa + node-pty + Socket.IO → Hono + Bun native (WebSocket/pty can be added with `bun:pty` or `node-pty` rebuild)
- **State**: Pinia (Vue) → Zustand (React) + TanStack Query (server state) ready
- **Routing**: Vue Router → TanStack Router (file-based, type-safe)
- **UI**: Naive UI → shadcn/ui (`base-nova` preset, `base-ui` primitives, Tabler icons)
- **Auth**: Same token-based auth (`~/.hermium-web-ui/.token`)
- **Proxy**: Same SSE interception logic for `run.completed` usage tracking (ready to wire up)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8648` | API listen port |
| `BIND_HOST` | `0.0.0.0` | API bind host |
| `HERMES_WEB_UI_HOME` | `~/.hermium-web-ui` | Data home (DB, uploads, token) |
| `AUTH_DISABLED` | — | Set `1` to disable auth |
| `AUTH_TOKEN` | — | Explicit bearer token |
| `PROFILE` | `default` | Active Hermes profile |
| `GATEWAY_HOST` | `127.0.0.1` | Hermes Gateway host |

## Next Steps

1. **Chat runtime**: Wire Socket.IO or native Bun WebSocket for `/chat-run` streaming
2. **File browser**: Add `src/routes/hermes/files.ts` handlers with local/Docker/SSH backends
3. **Group chat**: Add Socket.IO namespace + `gc_*` table logic
4. **Terminal**: Add `node-pty` or `bun:pty` WebSocket endpoint
5. **Settings pages**: Build forms for models, providers, profiles, channels
6. **Usage analytics**: Charts from `usage` SQLite table
