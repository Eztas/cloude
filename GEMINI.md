# Project: Cloude

This project is a web application utilizing a hybrid architecture of a React frontend and a Cloudflare Workers backend.

## Architecture
- **Frontend:** React (TypeScript), bundled with Vite
- **Backend:** Cloudflare Workers (TypeScript), hono
- **Tooling:** Wrangler for deployment and development
- UI: Tailwind CSS, shadcn/ui
- Database: Cloudflare D1, Cloudflare KV
- ORM: Drizzle
- Package Manager: pnpm

## Development Workflow
- **Environment:** Node.js with pnpm.
- **Commands:**
  - `pnpm dev`: Starts the Vite development server (includes Hono for the Worker backend).
  - `pnpm build`: Builds the frontend and prepares the worker.
  - `pnpm lint`: Runs `oxlint`.
  - `pnpm run deploy`: Builds and deploys the worker using `wrangler`.

## Coding Standards & Conventions
- **Language:** Strictly TypeScript.
- **Component Style:** Functional components with React.
- **Linting:** `oxlint` with type-aware rules configured in `.oxlintrc.json`.
- **Database (Planned):** Integration with Drizzle ORM and Cloudflare D1.

## Operational Notes
- Refer to `wrangler.jsonc` for backend configuration and D1 bindings.
- Always verify type definitions (`pnpm run cf-typegen`).

## Coding Guidelines
- Prefer functional React components.
- Reuse existing utilities before creating new ones.
- Do not introduce new dependencies unless necessary.
- Follow existing naming conventions.
