# Volo — AWS production infrastructure (Terraform)

Provisions: VPC (public + private subnets across 2 AZs, 1 NAT gateway) →
RDS Postgres 16 (Multi-AZ in production, 7-day backups) → ElastiCache Redis
(TLS, replication group) → private S3 bucket for KYC uploads → ECR repo →
ECS Fargate service behind an ALB (autoscaling on CPU, zero-downtime rolling
deploys) → optional Route53/ACM for a real HTTPS domain.

This is a starting production topology for a few thousand to a few hundred
thousand DAU. Getting to the 20M+ DAU target in `prompt.txt` requires further
work this stack does not attempt: multi-region active-active, DB read
replicas + connection pooling (PgBouncer/RDS Proxy), CDN in front of the API,
and splitting the monolith's hottest paths (matching, location updates) into
independently scaled services. Don't build that upfront — add it when
metrics tell you a specific piece is the bottleneck.

## Prerequisites

- An AWS account, and the AWS CLI configured (`aws sts get-caller-identity`
  should work).
- Terraform >= 1.5 (`brew install hashicorp/tap/terraform`).
- Docker, to build and push the backend image.

## One-time setup: remote state (strongly recommended)

Local `.tfstate` files get lost, conflict between teammates, and can leak
secrets. Create these once by hand, then uncomment the `backend "s3" {}`
block in `providers.tf`:

```bash
aws s3api create-bucket --bucket volo-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket volo-terraform-state \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name volo-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Deploy

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # then edit non-secret values
export TF_VAR_jwt_secret="$(openssl rand -hex 32)"
export TF_VAR_stripe_secret_key="sk_live_..."
export TF_VAR_stripe_webhook_secret="whsec_..."
export TF_VAR_firebase_project_id="..."
export TF_VAR_firebase_client_email="..."
export TF_VAR_firebase_private_key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

terraform init
terraform apply   # creates everything, backend service runs a placeholder image
```

Build and push the real backend image, then point the service at it:

```bash
cd ../../backend
REPO_URL=$(cd ../infra/aws && terraform output -raw ecr_repository_url)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${REPO_URL%/*}"
docker build -t "$REPO_URL:$(git rev-parse --short HEAD)" .
docker push "$REPO_URL:$(git rev-parse --short HEAD)"

cd ../infra/aws
terraform apply -var="backend_image=${REPO_URL}:$(git rev-parse --short HEAD)"
```

Run database migrations once (before, or right after, the first real deploy
— never rely on `synchronize: true` in production, see
`backend/src/data-source.ts`):

```bash
# From a machine with network access to the RDS instance (e.g. a bastion,
# or temporarily via `aws ecs run-task` with the same task definition and
# command overridden to `npm run migration:run`).
npm run migration:run
```

## Subsequent deploys (CI/CD)

Build → push a new image tag → run `aws ecs update-service --force-new-deployment`
(or `terraform apply -var="backend_image=..."`) — wire this into
`.github/workflows/backend-ci.yml` as a deploy stage once this stack exists.

## What this does NOT include yet

- CloudFront/CDN in front of the API.
- WAF rules (add `aws_wafv2_web_acl` + associate with the ALB before public
  launch if you expect abuse/scraping).
- A staging environment (duplicate this stack with
  `environment = "staging"` and a separate `terraform.tfvars`/state key).
- Centralized error tracking (add Sentry in the app code — infra alone
  won't catch application-level bugs).
