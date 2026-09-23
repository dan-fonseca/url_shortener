variable "name" {
  description = "Name prefix for CDN resources."
  type        = string
}

variable "api_endpoint" {
  description = "API Gateway endpoint URL (https://...)."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_100 = North America + Europe edges (cheapest)."
  type        = string
  default     = "PriceClass_100"
}

variable "force_destroy" {
  description = "Allow destroying the web bucket even if it has objects (use for non-prod)."
  type        = bool
  default     = false
}

variable "domain_name" {
  description = "Optional custom domain (e.g. go.example.com). Null uses the *.cloudfront.net domain."
  type        = string
  default     = null
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for domain_name. Required when domain_name is set."
  type        = string
  default     = null

  validation {
    condition     = var.domain_name == null || var.hosted_zone_id != null
    error_message = "hosted_zone_id is required when domain_name is set."
  }
}
