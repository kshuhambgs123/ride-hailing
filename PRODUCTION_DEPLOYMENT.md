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
export TF_VAR_razorpay_key_id="rzp_live_..."      # omit entirely if not offering Razorpay
export TF_VAR_razorpay_key_secret="..."
export TF_VAR_razorpay_webhook_secret="..."        # see step 3
export TF_VAR_paypal_client_id="..."               # omit entirely if not offering PayPal
export TF_VAR_paypal_client_secret="..."
export TF_VAR_paypal_webhook_id="..."              # see step 3
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

**Razorpay** — same reasoning, same consequence if skipped:
1. Dashboard → Settings → Webhooks → Add webhook:
   `https://<your-api-domain>/api/webhooks/razorpay`, subscribed to
   `payment_link.paid`, `payment_link.cancelled`, `payment_link.expired`.
2. Set the secret you choose there as `TF_VAR_razorpay_webhook_secret` and
   `terraform apply` again.

**PayPal** — also use real keys, never credentials pasted into chat or
committed to the repo:
1. developer.paypal.com → your app → Webhooks → Add webhook:
   `https://<your-api-domain>/api/webhooks/paypal`, subscribed to
   `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`,
   `PAYMENT.CAPTURE.DENIED`.
2. Set the webhook's ID as `TF_VAR_paypal_webhook_id` and `terraform apply`
   again. (PayPal verifies webhooks via an API call using this ID, not a
   local HMAC — see `backend/src/services/payment/PayPalProvider.ts`.)

If you're not offering Razorpay or PayPal, just leave those `TF_VAR_*`
vars unset — `backend/src/services/PaymentService.ts` only constructs a
gateway's client (and only then errors if misconfigured) the first time
that specific payment method is actually used, never at startup.

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

### Launching in Delhi NCR

The app is configured for Delhi NCR (`backend/src/config/market.ts`):
amounts in rupees, the 112 emergency number, and a service area covering
Delhi, Gurugram, Noida, Greater Noida, Ghaziabad and Faridabad. Both ends of
every trip must be inside it. The non-code side needs as much attention.
Treat this as a list of questions for a transport lawyer, not legal advice:

- [ ] **Three states, three regulators.** Delhi, Uttar Pradesh (Noida,
      Ghaziabad) and Haryana (Gurugram, Faridabad) each license ride-hailing
      aggregators separately. Delhi has its own aggregator scheme (2023), and
      the central Motor Vehicle Aggregator Guidelines set baseline rules
      (driver checks, insurance, fare and surge limits) that each state
      applies. Plan which state you license in first, and how trips that
      cross state lines (e.g. Ghaziabad to Gurugram) are permitted.
- [ ] **Commercial vehicles.** Paid rides generally need commercially
      registered vehicles (yellow plates, commercial permit and insurance).
      Paid "carpooling" in private cars is a legal grey area. Get a clear
      answer before launching carpooling, not after.
- [ ] **Aadhaar.** The app stores the government ID number a driver types in
      (`User.governmentId`). Aadhaar numbers have strict storage rules. Use
      masked numbers or DigiLocker-style verification, and don't keep the
      raw number.
- [ ] **Privacy.** The Digital Personal Data Protection Act applies to
      location, phone numbers and ID documents: consent, a published privacy
      policy, and a way to delete an account's data.
- [ ] **Tax.** GST registration, plus tax deductions on driver payouts as an
      e-commerce operator. Ask your accountant.
- [ ] **Payments.** Razorpay (UPI, cards, netbanking) and cash are the right
      defaults here. Stripe needs extra approval for Indian businesses, and
      PayPal no longer handles payments within India at all, so it can't take
      rupee fares.
- [ ] **Prices.** The rates (₹20 base + ₹12/km local, `PricingService.ts`)
      and the fixed amounts (₹10 welcome credit, ₹1 priority deposit, ₹2
      cancellation fee, ₹50 referral reward) were never set for India.
      Compare against local fares and set them deliberately before launch.
- [ ] **Start small.** Pick one dense corridor first, for example Ghaziabad
      (Indirapuram, Vaishali, Raj Nagar Extension) to Noida and East Delhi
      office commutes, and recruit drivers there before marketing to riders.

## 7. Onboarding a new white-label operator

This backend is multi-tenant (see `backend/src/entities/Tenant.ts`) — one
deployment can serve many branded operators sharing the same infrastructure,
each with its own isolated users, rides, and transactions. Onboarding one is
data, not a redeploy:

1. Insert a `Tenant` row (slug, display name, branding, commission rate) —
   there's no admin UI for this yet, so do it directly via a one-off script
   or a `psql`/TypeORM query against the production database. The slug is
   what the operator's app build sends as `X-Tenant-Slug`.
2. New EAS build profile in `frontend/eas.json`, cloned from `production`,
   with that tenant's `EXPO_PUBLIC_TENANT_SLUG` and the operator's own app
   name/bundle identifier/icon in `app.json` (a config override per profile,
   or a separate `app.config.js` keyed off an env var if you're managing
   several operators from one repo).
3. Give the operator an admin: have them sign up in their app as a normal
   rider, then set that account's role to admin directly in the database
   (`UPDATE "user" SET role = 'admin' WHERE "phoneNumber" = '...' AND
   "tenantId" = '...'`). They'll see the Admin dashboard, including the
   driver application queue, on their next login. Nobody can drive for
   that operator until one of its admins approves them.
4. `GET /api/platform/tenant-config` (no auth required) returns that
   tenant's name/logo/color at runtime — use it to theme the app dynamically
   instead of hardcoding "Volo" branding everywhere.
5. That operator's own Stripe/Razorpay/PayPal credentials, if they want
   payouts going to their own merchant account rather than yours — the
   current payment code uses one shared set of gateway credentials for
   every tenant (`backend/src/services/PaymentService.ts`), so per-tenant
   payment credentials are a real next step once an operator needs it, not
   something this deployment handles yet.

A token minted for one tenant is rejected by every other tenant's
connections (`authMiddleware`, `socketAuth`) — a bug in one operator's app
can't leak into another's.

## 8. Rollback

- **Bad backend deploy**: `aws ecs update-service --cluster <cluster> --service <service> --task-definition <previous-task-def-arn> --force-new-deployment`
  (find the previous ARN with `aws ecs list-task-definitions`), or re-run
  `terraform apply -var="backend_image=<previous-tag>"`.
- **Bad mobile build**: EAS Update channels let you roll back a JS-only
  change without a new store submission; a native change needs a new build
  and store review, so budget review time into any native-code rollback plan.
