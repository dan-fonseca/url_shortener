variable "project" {
  description = "Project name used as a resource name prefix."
  type        = string
  default     = "url-shortener"
}

variable "environment" {
  description = "Deployment environment (dev, prod, ...)."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,15}$", var.environment))
    error_message = "environment must be lowercase alphanumeric/dashes, 2-16 chars."
  }
}

variable "lambda_dist_dir" {
  description = "Directory containing one bundled folder per Lambda handler."
  type        = string
}

variable "deletion_protection" {
  description = "Protect stateful resources (DynamoDB table, web bucket) from deletion."
  type        = bool
  default     = true
}

variable "point_in_time_recovery" {
  description = "Enable DynamoDB PITR (continuous backups, small extra cost)."
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for Lambda and API access logs."
  type        = number
  default     = 14
}

variable "log_level" {
  description = "Application log level."
  type        = string
  default     = "info"
}

variable "api_rate_limit" {
  description = "Stage-wide steady-state requests per second."
  type        = number
  default     = 100
}

variable "api_burst_limit" {
  description = "Stage-wide burst capacity."
  type        = number
  default     = 200
}

variable "create_rate_limit" {
  description = "Requests per second for POST /api/links."
  type        = number
  default     = 10
}

variable "create_burst_limit" {
  description = "Burst capacity for POST /api/links."
  type        = number
  default     = 20
}

variable "price_class" {
  description = "CloudFront price class."
  type        = string
  default     = "PriceClass_100"
}

variable "domain_name" {
  description = "Optional custom domain. Null = use the CloudFront domain."
  type        = string
  default     = null
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone for domain_name."
  type        = string
  default     = null
}
