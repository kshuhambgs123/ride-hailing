variable "project" {
  description = "Short project name used as a prefix for all resources"
  type        = string
  default     = "volo"
}

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  default     = "production"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.medium is a reasonable start; scale up or add a read replica as traffic grows."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage_gb" {
  type    = number
  default = 100
}

variable "db_name" {
  type    = string
  default = "volo"
}

variable "db_username" {
  type    = string
  default = "volo_app"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.medium"
}

variable "backend_image" {
  description = "Full ECR image URI:tag for the backend container. Set after the first `docker push` to the ECR repo this stack creates."
  type        = string
  default     = ""
}

variable "backend_container_port" {
  type    = number
  default = 5000
}

variable "backend_desired_count" {
  description = "Number of Fargate tasks to run. Keep at 2+ in production so the Socket.io Redis adapter path is actually exercised and you have zero-downtime deploys."
  type        = number
  default     = 2
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "domain_name" {
  description = "Apex domain for the API, e.g. volo.app. Leave empty to skip Route53/ACM and use the ALB's default DNS name instead."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Existing hosted zone ID for domain_name, if domain_name is set."
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT signing secret. Pass via TF_VAR_jwt_secret or a CI secret — never commit a real value."
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "firebase_project_id" {
  type    = string
  default = ""
}

variable "firebase_client_email" {
  type    = string
  default = ""
}

variable "firebase_private_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_repo" {
  description = "GitHub repo allowed to assume the CI deploy role, as \"owner/name\". Leave empty to skip creating the GitHub OIDC deploy role."
  type        = string
  default     = ""
}

variable "tags" {
  type = map(string)
  default = {
    ManagedBy = "terraform"
  }
}
