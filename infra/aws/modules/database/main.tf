variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "allowed_security_group_ids" { type = list(string) }
variable "instance_class" { type = string }
variable "allocated_storage_gb" { type = number }
variable "db_name" { type = string }
variable "db_username" { type = string }

locals {
  name = "${var.project}-${var.environment}"
}

resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "db" {
  name_prefix = "${local.name}-db-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres from backend tasks"
    from_port       = 5432
    to_port         = 5432
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

resource "random_password" "master" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name = "${local.name}/database"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.master.result
    host     = aws_db_instance.this.address
    port     = 5432
    dbname   = var.db_name
    url      = "postgres://${var.db_username}:${random_password.master.result}@${aws_db_instance.this.address}:5432/${var.db_name}"
  })
}

resource "aws_db_instance" "this" {
  identifier     = "${local.name}-db"
  engine         = "postgres"
  engine_version = "16"
  # PostGIS (for Redis-independent geospatial queries / spatial indexes on
  # the Ride entity) is a CREATE EXTENSION away on RDS Postgres 16 — run
  # `CREATE EXTENSION IF NOT EXISTS postgis;` once connected.
  instance_class            = var.instance_class
  allocated_storage         = var.allocated_storage_gb
  max_allocated_storage     = var.allocated_storage_gb * 4
  storage_type              = "gp3"
  storage_encrypted         = true
  db_name                   = var.db_name
  username                  = var.db_username
  password                  = random_password.master.result
  db_subnet_group_name      = aws_db_subnet_group.this.name
  vpc_security_group_ids    = [aws_security_group.db.id]
  multi_az                  = var.environment == "production"
  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "mon:04:30-mon:05:30"
  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "${local.name}-final" : null
  apply_immediately         = var.environment != "production"

  tags = { Name = "${local.name}-db" }
}

output "endpoint" { value = aws_db_instance.this.address }
output "security_group_id" { value = aws_security_group.db.id }
output "secret_arn" { value = aws_secretsmanager_secret.db.arn }
