# Production Deployment

This is the real production path: AWS-hosted backend (RDS, ElastiCache,
ECS Fargate), CI/CD via GitHub Actions, and app store submission via EAS.

For a free-tier path to test with real users before committing to this
(Render + Supabase + Upstash), see **[SETUP_AND_LAUNCH.md](SETUP_AND_LAUNCH.md)**
instead — migrate from that to this once you have traction, by following
its "Migrating to AWS later" section.

## Prerequisites

**Accounts**
- AWS account with billing enabled, and the AWS CLI configured
  (`aws sts get-caller-identity` should succeed)
- A Firebase project with **Phone** sign-in enabled (Authentication →
  Sign-in method) — same project the backend and mobile app both use
- A Stripe account, switched to **live mode** keys
- An Apple Developer account ($99/yr) and a Google Play Developer account
  ($25 one-time), if you're submitting to the app stores
- An Expo/EAS account (free tier is fine for building)

**Tools**
- Terraform >= 1.5 (`brew install hashicorp/tap/terraform`)
- Docker, to build the backend image
- `eas-cli` (`npm install -g eas-cli`)

**Decisions to make before you start**
- A domain name for the API (e.g. `api.volo.app`) and a Route53 hosted zone
  for it — optional, but you want real HTTPS before going live, not the raw
  ALB hostname
- Your region/city's ride-hailing or carpooling licensing requirements —
  this is a legal gate, not a technical one; confirm it before real users
  pay real money through this app
- Whether you're launching carpooling-only first (lighter regulatory bar)
  or full on-demand dispatch

**Before any of this**, make sure you're on the latest `main` — the fixes in
this repo's history (KYC verification scoping, the Stripe webhook as the
source of truth for payment status, Socket.io authentication, the
production gate on the dev-only mock login) are load-bearing for a real
launch, not optional cleanup.

## 1. Backend infrastructure (Terraform)

Full detail, including the "what this does NOT include yet" list (CDN, WAF,
staging environment), is in
**[infra/aws/README.md](infra/aws/README.md)**. Summary:

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # edit non-secret values
export TF_VAR_jwt_secret="$(openssl rand -hex 32)"
export TF_VAR_stripe_secret_key="sk_live_..."
export TF_VAR_stripe_webhook_secret="whsec_..."   # see step 3 — you'll come back and set this
export TF_VAR_firebase_project_id="..."
export TF_VAR_firebase_client_email="..."
export TF_VAR_firebase_private_key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

terraform init
terraform apply   # provisions everything; ECS runs a placeholder image until step 2
```

This provisions: VPC, RDS Postgres (Multi-AZ, encrypted, 7-day backups),
ElastiCache Redis (TLS), a private S3 bucket for KYC uploads, ECR, and an
ECS Fargate service behind an ALB.

## 2. Build and ship the backend image

```bash
cd backend
REPO_URL=$(cd ../infra/aws && terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${REPO_URL%/*}"
docker build -t "$REPO_URL:$(git rev-parse --short HEAD)" .
docker push "$REPO_URL:$(git rev-parse --short HEAD)"

cd ../infra/aws
terraform apply -var="backend_image=${REPO_URL}:$(git rev-parse --short HEAD)"
```

Then run migrations once (see infra/aws/README.md for the exact
`aws ecs run-task` invocation — never rely on TypeORM's `synchronize` in
production, see `backend/src/data-source.ts`).

## 3. Wire up the Stripe webhook

The backend only trusts Stripe's webhook as proof a payment succeeded (see
`backend/src/controllers/webhook.controller.ts`) — the client confirming a
PaymentIntent is never enough on its own.

1. Get your API's public URL: `terraform output -raw alb_dns_name` (or
   `terraform output -raw api_url` if you set a custom domain).
2. In the Stripe Dashboard → Developers → Webhooks → Add endpoint:
   `https://<your-api-domain>/api/webhooks/stripe`, listening for at least
   `payment_intent.succeeded` and `payment_intent.payment_failed`.
3. Copy the signing secret (`whsec_...`) it gives you and set it:
   ```bash
   export TF_VAR_stripe_webhook_secret="whsec_..."
   cd infra/aws && terraform apply
   ```

Skipping this step means card payments stay stuck at `paymentStatus:
"pending"` forever, regardless of whether Stripe actually charged the card.

## 4. CI/CD (GitHub Actions)

`.github/workflows/backend-ci.yml` already has the deploy job — it builds,
runs migrations as a one-off ECS task, and rolls out the new image on every
push to `main`. It needs the Terraform stack's `module.github_oidc` applied
(set `github_repo = "owner/name"` in `terraform.tfvars`) plus these repo
settings (Settings → Secrets and variables → Actions):

| Type | Name | Value |
|---|---|---|
| Secret | `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |
| Variable | `AWS_REGION` | e.g. `us-east-1` |
| Variable | `ECR_REPOSITORY` | `terraform output -raw ecr_repository_name` |
| Variable | `ECS_CLUSTER` | `terraform output -raw ecs_cluster_name` |
| Variable | `ECS_SERVICE` | `terraform output -raw ecs_service_name` |
| Variable | `ECS_TASK_DEFINITION_FAMILY` | `terraform output -raw ecs_task_definition_family` |
| Variable | `ECS_SUBNET_IDS` | comma-join `terraform output -json private_subnet_ids` |
| Variable | `ECS_SECURITY_GROUP_ID` | `terraform output -raw ecs_security_group_id` |

All of these are now real root-level Terraform outputs (added alongside this
doc) — run `terraform output` after `apply` to see them all at once.

## 5. Mobile app (EAS build + store submission)

1. Set production env vars for the build — either in `frontend/eas.json`'s
   `build.production.env` (already set for `EXPO_PUBLIC_API_BASE_URL`) or
   via `eas env:create --environment production` for the Firebase config
   (`EXPO_PUBLIC_FIREBASE_*`, see `frontend/.env.example`) so EAS's cloud
   build picks them up — a local `.env` file is NOT read by cloud builds.
2. Replace `frontend/app.json`'s `owner` placeholder with your real Expo
   account, and confirm `bundleIdentifier`/`package` (`com.volo.ride`) are
   the ones registered in App Store Connect / Google Play Console.
3. Fill in `frontend/eas.json`'s `submit.production` placeholders
   (`appleId`, `ascAppId`, `appleTeamId`, Play service account key path).
4. Build and submit:
   ```bash
   cd frontend
   eas build --platform all --profile production
   eas submit --platform all --profile production
   ```

## 6. Before you flip it on for real users

- [ ] `legal/PRIVACY_POLICY.md` and `legal/TERMS_OF_SERVICE.md` — placeholders
      filled in, reviewed, published, and linked from the app
- [ ] Confirmed your region's ride-hailing/carpooling licensing requirements
- [ ] CORS in `backend/src/index.ts` restricted to your real app origin
      (currently `"*"`)
- [ ] Stripe in live mode, webhook verified end-to-end with a real test charge
- [ ] Firebase phone auth tested end-to-end on a real device (reCAPTCHA
      needs real network access to Google's domains — test on both iOS and
      Android, not just a simulator)
- [ ] A way to be notified when something breaks — this stack doesn't ship
      with error tracking; add Sentry or similar to the backend and app
      before, not after, you have real users depending on it

## 7. Rollback

- **Bad backend deploy**: `aws ecs update-service --cluster <cluster> --service <service> --task-definition <previous-task-def-arn> --force-new-deployment`
  (find the previous ARN with `aws ecs list-task-definitions`), or re-run
  `terraform apply -var="backend_image=<previous-tag>"`.
- **Bad mobile build**: EAS Update channels let you roll back a JS-only
  change without a new store submission; a native change needs a new build
  and store review, so budget review time into any native-code rollback plan.
