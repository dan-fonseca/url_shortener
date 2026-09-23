variable "region" {
  description = "Primary AWS region."
  type        = string
  default     = "us-east-1"
}

variable "repository" {
  description = "Source repository, recorded as a tag on every resource."
  type        = string
  default     = "unknown"
}

variable "deletion_protection" {
  type = bool
}

variable "point_in_time_recovery" {
  type = bool
}

variable "log_retention_days" {
  type = number
}

variable "log_level" {
  type = string
}

variable "create_rate_limit" {
  type = number
}

variable "create_burst_limit" {
  type = number
}

variable "domain_name" {
  description = "Optional custom domain, e.g. go.example.com."
  type        = string
  default     = null
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for domain_name."
  type        = string
  default     = null
}
