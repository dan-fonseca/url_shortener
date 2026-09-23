terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = ">= 6.0"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  name = "${var.project}-${var.environment}"

  functions = {
    createLink = { description = "POST /api/links - create a short link", actions = ["dynamodb:PutItem"] }
    redirect   = { description = "GET /{code} - resolve, count click, redirect", actions = ["dynamodb:UpdateItem"] }
    getLink    = { description = "GET /api/links/{code} - link stats", actions = ["dynamodb:GetItem"] }
  }
}

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

resource "aws_dynamodb_table" "links" {
  name                        = "${local.name}-links"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "code"
  deletion_protection_enabled = var.deletion_protection

  attribute {
    name = "code"
    type = "S"
  }

  # Expired links are deleted by DynamoDB at no cost; the app also checks
  # expiresAt at read time because TTL deletion can lag by hours.
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  server_side_encryption {
    enabled = true
  }
}

# ---------------------------------------------------------------------------
# Compute: one function per route, each with only the DynamoDB action it needs
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "function" {
  for_each = local.functions

  statement {
    actions   = each.value.actions
    resources = [aws_dynamodb_table.links.arn]
  }
}

module "function" {
  source   = "../lambda_function"
  for_each = local.functions

  name               = "${local.name}-${each.key}"
  description        = each.value.description
  source_dir         = "${var.lambda_dist_dir}/${each.key}"
  policy_json        = data.aws_iam_policy_document.function[each.key].json
  log_retention_days = var.log_retention_days
  log_level          = var.log_level

  environment = merge(
    { TABLE_NAME = aws_dynamodb_table.links.name },
    var.domain_name != null ? { PUBLIC_BASE_URL = "https://${var.domain_name}" } : {},
  )
}

# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

module "api" {
  source = "../http_api"

  name                = local.name
  log_retention_days  = var.log_retention_days
  default_rate_limit  = var.api_rate_limit
  default_burst_limit = var.api_burst_limit

  routes = {
    create = {
      route_key     = "POST /api/links"
      function_name = module.function["createLink"].function_name
      invoke_arn    = module.function["createLink"].invoke_arn
      rate_limit    = var.create_rate_limit
      burst_limit   = var.create_burst_limit
    }
    stats = {
      route_key     = "GET /api/links/{code}"
      function_name = module.function["getLink"].function_name
      invoke_arn    = module.function["getLink"].invoke_arn
    }
    redirect = {
      route_key     = "GET /{code}"
      function_name = module.function["redirect"].function_name
      invoke_arn    = module.function["redirect"].invoke_arn
    }
    root = {
      route_key     = "GET /"
      function_name = module.function["redirect"].function_name
      invoke_arn    = module.function["redirect"].invoke_arn
    }
  }
}

# ---------------------------------------------------------------------------
# Edge
# ---------------------------------------------------------------------------

module "cdn" {
  source = "../cdn"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name           = local.name
  api_endpoint   = module.api.api_endpoint
  price_class    = var.price_class
  force_destroy  = !var.deletion_protection
  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id
}
