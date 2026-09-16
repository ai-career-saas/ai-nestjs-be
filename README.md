# AI Career SaaS — NestJS Backend

API gateway for the **AI Career Advisor** platform — handles authentication, billing, plan/quota enforcement, and proxies AI workloads to the FastAPI agent service. This is the sole owner of the PostgreSQL schema and Drizzle migrations across the platform.

Part of a three-tier architecture:

| Service | Stack | Role |
| --- | --- | --- |
| [`ai-career-fe`](https://github.com/ai-career-saas/ai-career-fe) | Next.js 15 | Frontend |
| **`ai-nestjs-be`** (this repo) | NestJS 11 | API gateway, auth, billing, quota |
| [`ai-fastapi-be`](https://github.com/ai-career-saas/ai-fastapi-be) | FastAPI + LangGraph | AI agent layer |

## Tech Stack

- **Framework:** NestJS 11, Express platform
- **ORM/DB:** Drizzle ORM, PostgreSQL (NeonDB)
- **Auth:** JWT (access + refresh), Passport
- **Billing:** Stripe (subscriptions, webhooks, billing portal)
- **Validation:** class-validator / class-transformer, global `ValidationPipe`
- **Rate limiting:** `@nestjs/throttler` (30 req/min default)
- **Docs:** Swagger, served at `/api/docs`
- **Container:** Docker, multi-stage build (`node:20-alpine`)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (a Neon connection string works out of the box)

### Setup

```bash
npm install
cp .env.example .env   # fill in the values below
npm run db:push        # push schema to your database (or db:migrate for tracked migrations)
npm run start:dev
```

Server runs at `http://localhost:4000`. Swagger docs at `http://localhost:4000/api/docs`.

### Environment Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay billing integration |
| `FASTAPI_URL` | Internal URL of the FastAPI AI service (`http://localhost:8000` locally) |
| `PORT` | Server port (default `4000`) |
| `NODE_ENV` | `development` / `production` |
| `FRONTEND_URL` | Used for CORS origin |

> Stripe keys are read via `ConfigModule` but not listed in `.env.example` yet — add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` if working on the billing module locally.

## Scripts

| Command | Description |
| --- | --- |
| `npm run start:dev` | Start with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build (`node dist/main`) |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev convenience, skips migration files) |
| `npm run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── main.ts                  # Bootstrap: Swagger, ValidationPipe, CORS, rawBody for Stripe
├── app.module.ts             # Root module wiring
├── database.module.ts        # Drizzle connection provider
├── database/
│   └── schema.ts              # Drizzle schema (source of truth — run db:generate after edits)
├── common/
│   ├── decorators/            # @CurrentUser, @Feature
│   ├── guards/                # QuotaGuard
│   └── interfaces/            # UserPayload
└── modules/
    ├── auth/                  # register, login, refresh, me
    ├── users/                 # profile, usage
    ├── plans/                 # subscription plan catalog
    ├── billing/                # Stripe/Razorpay subscribe, cancel, resume, invoices, webhook
    ├── usage/                  # quota tracking used by QuotaGuard
    ├── result/                  # persisted AI agent results (agent_results table)
    └── proxy/                   # forwards analyze / interview / ats-score / skill-upgrade to FastAPI
```

## API Overview

Full interactive reference at `/api/docs` (Swagger). Route prefix is currently **not** set (`app.setGlobalPrefix('api')` is commented out in `main.ts`), so routes are mounted at their controller path directly, e.g. `POST /auth/login` rather than `POST /api/auth/login` — worth confirming before wiring the frontend or infra health checks.

| Module | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` |
| Users | `GET /users`, `PATCH /users`, `GET /users/usage` |
| Plans | `GET /plans` |
| Billing | `POST /billing/subscribe`, `GET /billing/subscription`, `POST /billing/cancel`, `POST /billing/resume`, `GET /billing/invoices`, `GET /billing/portal`, `POST /billing/webhook` |
| Proxy (→ FastAPI) | `POST /proxy/analyze`, `POST /proxy/interview/generate`, `POST /proxy/ats/score`, `POST /proxy/skill-upgrade` |

Note: the ATS scoring endpoint is intentionally public/unlimited on this route's frontend counterpart — confirm `QuotaGuard`/`JwtAuthGuard` usage per-route in `proxy.controller.ts` before assuming all proxy routes require auth.

## Database

Drizzle ORM against PostgreSQL. `schema.ts` is the source of truth; `schema.sql` is a plain-SQL reference/bootstrap copy (e.g. for pasting into a fresh Neon/Supabase SQL editor) and can drift from `schema.ts` — treat `schema.ts` + `db:generate` as canonical.

This service owns all schema migrations. The FastAPI service performs row-level reads/writes only and never runs migrations.

## Docker

```bash
docker build -t ai-nestjs-be .
docker run -p 4000:4000 --env-file .env ai-nestjs-be
```

Multi-stage build: `npm ci && npm run build` in the builder stage, then a slim `node:20-alpine` runner with only `dist/`, `node_modules`, and `package.json` copied over, running as a non-root `nestjs` user.

## CI/CD

Deploys via GitLab CI/CD. Pipeline: `install → lint/typecheck/test → build → docker build & push to ECR → deploy to ECS Fargate` (OIDC-authenticated, no stored AWS keys), gated behind a manual approval on `main`. See the project's `.gitlab-ci.yml` once added.

## Related Repos

- [`ai-career-fe`](https://github.com/ai-career-saas/ai-career-fe) — Next.js frontend
- [`ai-fastapi-be`](https://github.com/ai-career-saas/ai-fastapi-be) — FastAPI + LangGraph AI agent service
