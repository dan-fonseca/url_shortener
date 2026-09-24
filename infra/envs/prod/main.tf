terraform {
  required_version = ">= 1.10"

  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 6.0" }
    archive = { source = "hashicorp/archive", version = "~> 2.7" }
  }

  # Partial config: bucket and region come from -backend-config in CI
  # (see .github/workflows/_deploy.yml). S3-native locking, no DynamoDB lock table.
  backend "s3" {
    key          = "url-shortener/prod.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "url-shortener"
      Environment = "prod"
      ManagedBy   = "terraform"
      Repository  = var.repository
    }
  }
}

# CloudFront only accepts ACM certificates from us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "url-shortener"
      Environment = "prod"
      ManagedBy   = "terraform"
      Repository  = var.repository
    }
  }
}

module "app" {
  source = "../../modules/url_shortener"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment     = "prod"
  lambda_dist_dir = "${path.root}/../../../services/api/dist"

  deletion_protection    = var.deletion_protection
  point_in_time_recovery = var.point_in_time_recovery
  log_retention_days     = var.log_retention_days
  log_level              = var.log_level
  create_rate_limit      = var.create_rate_limit
  create_burst_limit     = var.create_burst_limit
  domain_name            = var.domain_name
  hosted_zone_id         = var.hosted_zone_id
}
