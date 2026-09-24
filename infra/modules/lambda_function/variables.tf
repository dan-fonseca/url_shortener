variable "name" {
  description = "Function name; also used for the IAM role and log group."
  type        = string
}

variable "description" {
  description = "Human-readable description of the function."
  type        = string
  default     = ""
}

variable "source_dir" {
  description = "Directory containing the bundled index.mjs for this function."
  type        = string
}

variable "policy_json" {
  description = "IAM policy document granting the function access to its dependencies."
  type        = string
}

variable "environment" {
  description = "Extra environment variables."
  type        = map(string)
  default     = {}
}

variable "memory_size" {
  description = "Memory in MB (CPU scales with it)."
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Timeout in seconds."
  type        = number
  default     = 5
}

variable "log_level" {
  description = "Application log level: debug, info, warn or error."
  type        = string
  default     = "info"
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention."
  type        = number
  default     = 14
}
