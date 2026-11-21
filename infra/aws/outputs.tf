output "api_url" {
  value = module.ecs.api_url
}

output "ecr_repository_url" {
  description = "Push backend images here, then set TF_VAR_backend_image and re-apply"
  value       = module.ecs.ecr_repository_url
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
