# Volo

A ride-hailing / carpooling platform (backend: Node.js + TypeScript +
PostgreSQL + Redis + Socket.io; frontend: React Native / Expo).

## Repository layout

```
ride-hailing/
├── backend/        Node.js + TypeScript API (Express, TypeORM, Postgres, Redis, Socket.io)
├── frontend/       React Native (Expo) mobile app
├── infra/aws/      Terraform for production AWS infrastructure (VPC, RDS, Redis, S3, ECS/Fargate)
├── legal/          Privacy Policy & Terms of Service drafts (fill in placeholders before publishing)
└── .github/        CI (test + build) and CD (build, migrate, deploy) workflows
```

## Quick start

See **[USAGE.md](USAGE.md)** for full use cases, the API reference, running the
backend (Docker or local) and the frontend (Expo), and end-to-end flows.

```bash
# Backend (Docker — API + Postgres + Redis + backups)
cd backend && docker compose up --build

# Frontend
cd frontend && npm install && npm start
```

## Before you launch

See **[LAUNCH_PREREQUISITES.md](LAUNCH_PREREQUISITES.md)** for everything to
have in place before a Delhi NCR launch (company, licences, drivers, tax,
privacy, app gaps) and how to apply for government startup benefits.

## User flows

See **[USER_FLOWS.md](USER_FLOWS.md)** for diagrams of how riders, drivers,
admins, fleet owners and operators each use the app, with every broken or
unbuilt step marked.

## Free-tier setup & launch

See **[SETUP_AND_LAUNCH.md](SETUP_AND_LAUNCH.md)** for deploying at zero
infra cost (Render + Supabase + Upstash + AWS S3) and launching the mobile
app for testing, with a clear path to migrate to the AWS stack below later.

## Production deployment

See **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** for the full
production path: prerequisites, the Terraform/AWS stack (VPC, RDS
Postgres/PostGIS, ElastiCache Redis, S3, ECS Fargate + ALB), CI/CD via
**[.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml)**,
the Stripe webhook, and EAS app store submission.

## Store submission

`frontend/app.json` and `frontend/eas.json` are configured for iOS/Android
builds via EAS. Before submitting, replace the placeholder Firebase config in
`frontend/src/utils/firebase.ts`, set real Stripe keys, and fill in and
publish the legal docs in `legal/`.

## Legal

- [Privacy Policy](legal/PRIVACY_POLICY.md)
- [Terms of Service](legal/TERMS_OF_SERVICE.md)

Both are drafts — replace the `[BRACKETED]` placeholders and get them
reviewed before publishing.
