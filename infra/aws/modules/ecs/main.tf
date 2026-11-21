variable "project" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "container_port" { type = number }
variable "desired_count" { type = number }
variable "cpu" { type = number }
variable "memory" { type = number }
variable "image" { type = string }
variable "db_secret_arn" { type = string }
variable "s3_bucket_arn" { type = string }
variable "s3_bucket_name" { type = string }
variable "aws_region" { type = string }
variable "redis_primary_endpoint" { type = string }
variable "domain_name" { type = string }
variable "route53_zone_id" { type = string }
variable "jwt_secret" { type = string }
variable "stripe_secret_key" { type = string }
variable "firebase_project_id" { type = string }
variable "firebase_client_email" { type = string }
variable "firebase_private_key" { type = string }

locals {
  name    = "${var.project}-${var.environment}"
  use_tls = var.domain_name != ""
}

# --- ECR ------------------------------------------------------------------

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name}-backend"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 20 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}

# --- Security groups --------------------------------------------------------

resource "aws_security_group" "alb" {
  name_prefix = "${local.name}-alb-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

resource "aws_security_group" "backend" {
  name_prefix = "${local.name}-backend-"
  vpc_id      = var.vpc_id

  ingress {
    description     = "From ALB"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
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

# --- ALB --------------------------------------------------------------------

resource "aws_lb" "this" {
  name               = "${local.name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name}-backend"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 15
    timeout             = 5
    matcher             = "200"
  }

  # Allow in-flight Socket.io connections to finish instead of being killed
  # mid-deploy.
  deregistration_delay = 30
}

resource "aws_acm_certificate" "this" {
  count             = local.use_tls ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.use_tls ? {
    for dvo in aws_acm_certificate.this[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "this" {
  count                   = local.use_tls ? 1 : 0
  certificate_arn         = aws_acm_certificate.this[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = local.use_tls ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = local.use_tls ? [1] : []
      content {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }

    target_group_arn = local.use_tls ? null : aws_lb_target_group.backend.arn
  }
}

resource "aws_lb_listener" "https" {
  count             = local.use_tls ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.this[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

resource "aws_route53_record" "api" {
  count   = local.use_tls ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.this.dns_name
    zone_id                = aws_lb.this.zone_id
    evaluate_target_health = true
  }
}

# --- Secrets -----------------------------------------------------------------

resource "aws_secretsmanager_secret" "app" {
  name = "${local.name}/app"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_SECRET            = var.jwt_secret
    STRIPE_SECRET_KEY     = var.stripe_secret_key
    FIREBASE_PROJECT_ID   = var.firebase_project_id
    FIREBASE_CLIENT_EMAIL = var.firebase_client_email
    FIREBASE_PRIVATE_KEY  = var.firebase_private_key
  })
}

# --- IAM ----------------------------------------------------------------------

resource "aws_iam_role" "execution" {
  name = "${local.name}-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  name = "read-secrets"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [var.db_secret_arn, aws_secretsmanager_secret.app.arn]
    }]
  })
}

resource "aws_iam_role" "task" {
  name = "${local.name}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "task_s3" {
  name = "uploads-s3-access"
  role = aws_iam_role.task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      Resource = ["${var.s3_bucket_arn}/*"]
    }]
  })
}

# --- ECS --------------------------------------------------------------------

resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}-backend"
  retention_in_days = 30
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = "backend"
    image     = var.image
    essential = true
    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]
    environment = [
      { name = "PORT", value = tostring(var.container_port) },
      { name = "NODE_ENV", value = "production" },
      # rediss:// (not redis://): the ElastiCache replication group has
      # transit_encryption_enabled = true, and ioredis enables TLS
      # automatically off this URL scheme.
      { name = "REDIS_URL", value = "rediss://${var.redis_primary_endpoint}:6379" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "AWS_S3_BUCKET", value = var.s3_bucket_name },
    ]
    secrets = [
      # Matches backend/src/data-source.ts, which reads discrete DB_* vars,
      # not a single DATABASE_URL.
      { name = "DB_HOST", valueFrom = "${var.db_secret_arn}:host::" },
      { name = "DB_PORT", valueFrom = "${var.db_secret_arn}:port::" },
      { name = "DB_USER", valueFrom = "${var.db_secret_arn}:username::" },
      { name = "DB_PASSWORD", valueFrom = "${var.db_secret_arn}:password::" },
      { name = "DB_NAME", valueFrom = "${var.db_secret_arn}:dbname::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_SECRET::" },
      { name = "STRIPE_SECRET_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_SECRET_KEY::" },
      { name = "FIREBASE_PROJECT_ID", valueFrom = "${aws_secretsmanager_secret.app.arn}:FIREBASE_PROJECT_ID::" },
      { name = "FIREBASE_CLIENT_EMAIL", valueFrom = "${aws_secretsmanager_secret.app.arn}:FIREBASE_CLIENT_EMAIL::" },
      { name = "FIREBASE_PRIVATE_KEY", valueFrom = "${aws_secretsmanager_secret.app.arn}:FIREBASE_PRIVATE_KEY::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "backend"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.backend.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition] # CI/CD updates this via `aws ecs update-service`
  }

  depends_on = [aws_lb_listener.http]
}

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = var.desired_count * 5
  min_capacity       = var.desired_count
  resource_id        = "service/${aws_ecs_cluster.this.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "${local.name}-backend-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60
  }
}

output "alb_dns_name" { value = aws_lb.this.dns_name }
output "ecr_repository_url" { value = aws_ecr_repository.backend.repository_url }
output "ecr_repository_arn" { value = aws_ecr_repository.backend.arn }
output "backend_security_group_id" { value = aws_security_group.backend.id }
output "api_url" { value = local.use_tls ? "https://${var.domain_name}" : "http://${aws_lb.this.dns_name}" }
output "cluster_name" { value = aws_ecs_cluster.this.name }
output "cluster_arn" { value = aws_ecs_cluster.this.arn }
output "service_name" { value = aws_ecs_service.backend.name }
output "service_arn" { value = aws_ecs_service.backend.id }
output "task_definition_family" { value = aws_ecs_task_definition.backend.family }
output "task_execution_role_arn" { value = aws_iam_role.execution.arn }
output "task_role_arn" { value = aws_iam_role.task.arn }
output "log_group_name" { value = aws_cloudwatch_log_group.backend.name }
output "private_subnet_ids" { value = var.private_subnet_ids }
