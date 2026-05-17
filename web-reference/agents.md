# Hermium — Agents.md

> Rules for humans and AI agents working in this codebase.
> Keep this file updated as conventions evolve.

---

## Project Overview

- **Stack**: React 19, TanStack Start (SSR), TanStack Router, shadcn/ui (base-nova), Tailwind CSS v4
- **State**: Zustand for client state, TanStack Query for server state
- **Validation**: Zod for runtime type safety
- **Package manager**: Bun
- **Component library**: shadcn/ui with Tabler icons

---

## Project Structure

```
apps/web/
├── src/
│   ├── features/           # Feature-based modules
│   │   ├── dashboard/
│   │   │   ├── pages/      # Route-level components
│   │   │   ├── components/ # Feature-specific components
│   │   │   ├── types.ts    # Zod schemas + inferred types
│   │   │   ├── queries.ts  # TanStack Query hooks
│   │   │   ├── apis.ts     # Raw fetch wrappers (return JSON)
│   │   │   └── store.ts    # Zustand store (client-only state)
│   │   ├── chat/
│   │   ├── sessions/
│   │   ├── workspace/
│   │   └── settings/
│   ├── components/ui/      # shadcn/ui primitives (auto-generated)
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # Shared utilities, api client
│   └── routes/             # TanStack Router file routes
```

### Feature Module Rules

Every feature folder MUST contain:

| File | Purpose | Required |
|---|---|---|
| `types.ts` | Zod schemas + TypeScript types inferred from them | ✅ |
| `queries.ts` | TanStack Query hooks (useQuery, useMutation) | ✅ if has server data |
| `apis.ts` | Raw fetch functions that call the API | ✅ if has server data |
| `store.ts` | Zustand store for client-only state | ✅ if has client state |
| `pages/` | Route-level components | ✅ |
| `components/` | Feature-specific components | ✅ |

**Rules**:
- `apis.ts` functions return plain JSON — never call them from components directly
- `queries.ts` wraps `apis.ts` with TanStack Query — components only use these hooks
- `store.ts` must never duplicate server state — use queries for that
- Cross-feature shared types go in `src/lib/types.ts`

---

## Clean Code Rules

### 1. Component Rules

```
✅ DO:
- Keep components under 200 lines — extract when longer
- Use function declarations: `export function ChatBubble({ ... }: Props)`
- Co-locate props types: same file, above component
- Single responsibility: one component = one UI concern

❌ DON'T:
- Define components inside other components (rerender-15)
- Use `React.FC` — just type the props directly
- Default export components — use named exports
- Use `any` — derive from Zod schema with `z.infer<>`
```

### 2. State Management Rules

```
✅ Zustand — for client-only UI state (sidebar open, active tab, theme)
✅ TanStack Query — for ALL server state (sessions, messages, files)
✅ useRef — for values needed in callbacks without re-renders
✅ URL search params — for shareable/tab-restorable state

❌ Don't put server data in Zustand
❌ Don't put form state in Zustand (let React Hook Form handle it)
❌ Don't sync URL params to Zustand — read from router directly
```

### 3. Data Flow Rules

```
Component → query.ts hook → apis.ts fetch → API Server
                ↕
          TanStack Query cache

Component → store.ts hook → Zustand store (client-only)
```

### 4. Import Rules

```
✅ EXACT: 'use-debounce' → import { useDebounce } from 'use-debounce'
❌ BARREL: '@/components' → may import 50 components for one button
         → import { Button } from '@/components/ui/button'
```

### 5. TypeScript Rules

```
- All API responses must be validated with Zod before use
- Derive types from Zod schemas: type Chat = z.infer<typeof ChatSchema>
- Use discriminated unions for state: { status: 'idle' } | { status: 'loading' }
- No `as` casts except for narrowing DOM events
- Prefer `?.` and `??` over nested ternaries
```

### 6. Async & Data Fetching

```
- Start promises early, await late (async-parallel)
- Promise.all() for independent fetches (async-parallel)
- Use Suspense boundaries at page level for loading states
- Defer non-critical work: analytics, logging after hydration (bundle-3)
- Return early for cheap conditions before awaiting (async-1)
```

### 7. Rendering Performance

```
- Extract expensive computations to memoized components (rerender-2)
- Use functional setState: setCount(c => c + 1) (rerender-7)
- Pass function to useState for expensive init: useState(() => heavy()) (rerender-8)
- Derive state during render, not in effects (rerender-6)
- Use startTransition for non-urgent updates (rerender-12)
- content-visibility: auto for long scrollable lists (rendering-2)
- Ternary over && for conditional render: {show ? <A /> : null} (rendering-9)
```

### 8. JavaScript Micro-Optimizations

```
- Hoist RegExp outside loops (js-10)
- Use Set/Map instead of array.includes() for lookups (js-11)
- Return early: if (!data) return null (js-9)
- Cache property access in loops: const len = arr.length (js-4)
- Batch DOM writes: change className, not individual styles (js-1)
```

---

## Design System Rules

### Typography
```
- Body: Inter Variable (font-sans)
- Headings: Geist Variable (font-heading)
- Use modular type scale — vary weights for hierarchy
- No monospace for UI text — only for code/pre blocks
```

### Colors
```
- Use CSS variable tokens from shadcn (--primary, --muted, etc.)
- Never hardcode hex/rgb values — use Tailwind classes
- Semantic colors: destructive for errors only, not decoration
- Tint neutrals toward brand hue
```

### Components
```
- Use shadcn/ui primitives for interactive elements
- Tabler icons via @tabler/icons-react
- Compose, don't customize: prefer wrapping over patching
- One source of truth per component — no duplicate implementations
```

---

## Testing Rules

```
- Feature tests alongside the feature: features/chat/chat.test.tsx
- Test user behavior, not implementation details
- Use Testing Library: render, screen, userEvent
- Mock API calls at the fetch level, not the query level
- Each feature must have at least a smoke test rendering its page
```

---

## Chapter: Hermes Agent Integration

When integrating with the Hermes agent backend:

```
- SSE streaming via GET /api/chat/stream?stream_id=X
- Start a chat: POST /api/chat/start → returns {stream_id}
- Sessions: GET/POST /api/sessions, /api/session
- Files: GET /api/list, /api/file
- Use EventSource API with polyfill for reconnect
- Handle INFLIGHT state: messages mid-send survive session switches
- Approval cards: poll GET /api/approval/pending every 1500ms
```

---

## Version

v1.0.0 — Initial ruleset for Hermium frontend.
Maintainers: update this file when conventions change.
