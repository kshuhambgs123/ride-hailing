output "api_url" {
  value = module.ecs.api_url
}

output "ecr_repository_url" {
  description = "Push backend images here, then set TF_VAR_backend_image and re-apply"
  value       = module.ecs.ecr_repository_url
}

output "ecr_repository_name" {
  description = "Just the repo name (not the full URL) — what CI's ECR_REPOSITORY variable expects"
  value       = module.ecs.ecr_repository_name
}

output "alb_dns_name" {
  description = "Raw ALB hostname — use this for the Stripe webhook URL if domain_name isn't set yet"
  value       = module.ecs.alb_dns_name
}

output "ecs_security_group_id" {
  description = "What CI's ECS_SECURITY_GROUP_ID variable expects, for the one-off migration task"
  value       = module.ecs.backend_security_group_id
}

output "private_subnet_ids" {
  description = "Comma-join these for CI's ECS_SUBNET_IDS variable"
  value       = module.network.private_subnet_ids
}

output "db_endpoint" {
  value = module.database.endpoint
}

output "db_secret_arn" {
  description = "Secrets Manager secret holding DATABASE_URL and credentials"
  value       = module.database.secret_arn
}

output "redis_primary_endpoint" {
  value = module.redis.primary_endpoint
}

output "uploads_bucket" {
  value = module.storage.bucket_name
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "ecs_service_name" {
  value = module.ecs.service_name
}

output "ecs_task_definition_family" {
  value = module.ecs.task_definition_family
}

output "github_deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN secret in GitHub Actions (only set if github_repo was provided)"
  value       = length(module.github_oidc) > 0 ? module.github_oidc[0].role_arn : null
}
