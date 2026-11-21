variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "allowed_security_group_ids" { type = list(string) }
variable "node_type" { type = string }

locals {
  name = "${var.project}-${var.environment}"
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${local.name}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name_prefix = "${local.name}-redis-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from backend tasks"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Replication group (not a single cache cluster) so Multi-AZ automatic
# failover is available — a dead Redis node must not take down live
# tracking, chat, and geospatial driver lookups all at once.
resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = "${local.name}-redis"
  description                = "Volo cache + Socket.io adapter + driver geo index"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = var.node_type
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  apply_immediately          = var.environment != "production"
}

output "primary_endpoint" { value = aws_elasticache_replication_group.this.primary_endpoint_address }
output "reader_endpoint" { value = aws_elasticache_replication_group.this.reader_endpoint_address }
output "security_group_id" { value = aws_security_group.redis.id }
