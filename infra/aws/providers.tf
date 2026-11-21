terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Keep Terraform state off laptops and out of git. Create this bucket once,
  # by hand, before running `terraform init` here, then uncomment:
  #
  # backend "s3" {
  #   bucket         = "volo-terraform-state"
  #   key            = "aws/production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "volo-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project
      Environment = var.environment
    })
  }
}
