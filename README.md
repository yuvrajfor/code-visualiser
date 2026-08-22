# Code Story Studio

Code Story Studio turns learner-provided JavaScript, Python, C, and Java code into source-grounded visual stories and plain-English explanations.

| Workspace | Responsibility |
| --- | --- |
| `frontend/` | React UI, accessible SVG stages, optional React Three Fiber result view, and responsive learning experience. |
| `backend/` | Express/tRPC API, AI interpretation, AST analysis, capacity safeguards, persistence, and tests. |
| `shared/` | Cross-workspace constants and types. |
| `drizzle/` | Database schema and migrations. |

## Local commands

Run these commands from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Starts backend, API, and frontend together for local development. |
| `pnpm test` | Runs backend and shared learning-contract tests. |
| `pnpm check` | Type-checks frontend, backend, and shared code. |
| `pnpm build` | Builds the frontend bundle and production backend server. |

The default SVG visual works everywhere. The optional 3D result view uses React Three Fiber with WebGL fallback and loads only when a learner requests it.
