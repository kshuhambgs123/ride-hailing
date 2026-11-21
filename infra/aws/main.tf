module "network" {
  source      = "./modules/network"
  project     = var.project
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "database" {
  source                     = "./modules/database"
  project                    = var.project
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  allowed_security_group_ids = [module.ecs.backend_security_group_id]
  instance_class             = var.db_instance_class
  allocated_storage_gb       = var.db_allocated_storage_gb
  db_name                    = var.db_name
  db_username                = var.db_username
}

module "redis" {
  source                     = "./modules/redis"
  project                    = var.project
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  private_subnet_ids         = module.network.private_subnet_ids
  allowed_security_group_ids = [module.ecs.backend_security_group_id]
  node_type                  = var.redis_node_type
}

module "storage" {
  source      = "./modules/storage"
  project     = var.project
  environment = var.environment
}

module "ecs" {
  source                 = "./modules/ecs"
  project                = var.project
  environment            = var.environment
  vpc_id                 = module.network.vpc_id
  public_subnet_ids      = module.network.public_subnet_ids
  private_subnet_ids     = module.network.private_subnet_ids
  container_port         = var.backend_container_port
  desired_count          = var.backend_desired_count
  cpu                    = var.backend_cpu
  memory                 = var.backend_memory
  image                  = var.backend_image != "" ? var.backend_image : "public.ecr.aws/docker/library/nginx:latest" # placeholder until first image push
  db_secret_arn          = module.database.secret_arn
  s3_bucket_arn          = module.storage.bucket_arn
  s3_bucket_name         = module.storage.bucket_name
  aws_region             = var.aws_region
  redis_primary_endpoint = module.redis.primary_endpoint
  domain_name            = var.domain_name
  route53_zone_id        = var.route53_zone_id
  jwt_secret             = var.jwt_secret
  stripe_secret_key      = var.stripe_secret_key
  stripe_webhook_secret  = var.stripe_webhook_secret
  firebase_project_id    = var.firebase_project_id
  firebase_client_email  = var.firebase_client_email
  firebase_private_key   = var.firebase_private_key
}

module "github_oidc" {
  count  = var.github_repo != "" ? 1 : 0
  source = "./modules/github-oidc"

  project                 = var.project
  environment             = var.environment
  github_repo             = var.github_repo
  ecr_repository_arn      = module.ecs.ecr_repository_arn
  ecs_cluster_arn         = module.ecs.cluster_arn
  ecs_service_arn         = module.ecs.service_arn
  task_execution_role_arn = module.ecs.task_execution_role_arn
  task_role_arn           = module.ecs.task_role_arn
}
