# Setup & Launch (Free Tier → AWS)

This is the step-by-step path to get Volo running for real users at zero
infra cost, structured so moving to the `infra/aws` Terraform stack later is
just swapping env vars — no code changes.

For local development only, see [USAGE.md](USAGE.md) instead.

## 0. What you're setting up

| Piece | Free service |
|---|---|
| Backend API | [Render](https://render.com) (free web service) |
| Postgres | [Supabase](https://supabase.com) (free project) |
| Redis | [Upstash](https://upstash.com) (free database) |
| KYC/ID-proof file storage | AWS S3 (12-month free tier, one bucket) |
| OTP auth | Firebase (free Spark plan) |
| Payments | Stripe (test mode, switch to live later) |
| Mobile app | Expo EAS (free builds) + TestFlight / Internal Testing |

## 1. Supabase — Postgres

1. Create a project at supabase.com.
2. Settings → Database → note the host, port (usually `5432` or `6543` for
   pooled connections — use the direct `5432` connection for migrations),
   user, password, database name.
3. You'll set these as `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
   `DB_NAME` on Render, plus `DB_SSL=true`.

## 2. Upstash — Redis

1. Create a database at upstash.com (regional, not global, is fine and cheaper).
2. Copy the `rediss://...` connection string (note the extra `s` — it's TLS).
   This is your `REDIS_URL`. `ioredis` handles TLS automatically from the
   `rediss://` scheme, no code change needed.

## 3. AWS — S3 bucket only (not the full stack yet)

1. Create one S3 bucket for KYC/ID-proof uploads.
2. Create an IAM user scoped to only that bucket (`s3:PutObject`,
   `s3:GetObject`) — not an admin key.
3. Note the access key, secret key, region, and bucket name
   (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
   `AWS_S3_BUCKET`).

This is the same config `infra/aws` expects later, so nothing here is thrown
away when you migrate.

## 4. Firebase — OTP auth

1. Use or create a Firebase project (free Spark plan covers early volume).
2. Project settings → Service accounts → generate a new private key.
3. Note `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
   `FIREBASE_PRIVATE_KEY` (keep the `\n` escapes when pasting into env vars).
4. Add the same project's web config to `frontend/src/utils/firebase.ts`.

## 5. Stripe

1. Use your test mode secret key (`sk_test_...`) to start — switch to a live
   key only once you're ready to move real money.

## 6. Deploy the backend — Render

1. New → Web Service → connect this repo, root directory `backend/`.
2. Render picks up [`backend/render.yaml`](backend/render.yaml) for build/start
   commands and the health check path.
3. In the dashboard, fill in every env var marked `sync: false` in
   `render.yaml`: the Supabase, Upstash, Firebase, Stripe, and S3 values from
   steps 1–5, plus `JWT_SECRET` (any long random string).
4. Deploy. The start command runs `npm run migration:run:prod` before
   booting the server, so your Supabase schema is created automatically on
   first deploy.
5. Confirm it's alive: `https://<your-service>.onrender.com/api/health` and
   `/api-docs` (Swagger).

Render's free tier sleeps the service after inactivity — the first request
after a sleep takes a few extra seconds. Fine for testing/early users; upgrade
or move to AWS once that matters.

## 7. Point the mobile app at your deployed backend

1. `cd frontend && cp .env.example .env`
2. Set `EXPO_PUBLIC_API_BASE_URL=https://<your-service>.onrender.com`
   (leave unset for local dev — it auto-detects your LAN IP instead).
3. `npm install`

## 8. Build & launch the app

```bash
cd frontend
npx eas login
npx eas build --platform ios --profile preview      # or android
```

- For free internal testing: distribute via **TestFlight** (iOS) or an
  **Internal Testing** track (Android) — no App Store review needed yet.
- Before a public store release: replace placeholder Firebase config, set
  live Stripe keys, and publish the filled-in docs in
  [legal/](legal/) (Privacy Policy, Terms of Service) — required by both
  app stores.

## 9. Before real users touch it

- [ ] `legal/PRIVACY_POLICY.md` and `legal/TERMS_OF_SERVICE.md` — placeholders
      filled in, published, linked from the app
- [ ] Tighten CORS in `backend/src/index.ts` (`origin: "*"` → your app's
      actual origin)
- [ ] Confirm your city/state's rules on ride-hailing/carpooling licensing —
      carpooling (cost-sharing) generally has a lighter regulatory bar than
      on-demand taxi dispatch; consider launching carpooling-only first
- [ ] Start in one small, dense market (one campus/neighborhood), not a whole city

## 10. Migrating to AWS later

Nothing in the application code changes. When you provision the Terraform
stack in [infra/aws](infra/aws):

1. `terraform apply` to stand up RDS Postgres, ElastiCache Redis, ECS/Fargate, ALB.
2. Run migrations against the new RDS instance (`npm run migration:run:prod`).
3. Point `DB_HOST`/`DB_PORT` at RDS and `REDIS_URL` at ElastiCache.
4. Reuse the same S3 bucket and IAM credentials — no change needed there.
5. Cut over the frontend's `EXPO_PUBLIC_API_BASE_URL` to the ALB's domain.
6. Decommission the Render service once traffic is confirmed healthy on AWS.

The existing CI/CD pipeline in
[.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml) already
targets this AWS path for when you're ready.
