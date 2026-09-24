variable "name" {
  description = "API name."
  type        = string
}

variable "routes" {
  description = "Routes keyed by a short identifier. rate_limit/burst_limit override the stage defaults."
  type = map(object({
    route_key     = string
    function_name = string
    invoke_arn    = string
    rate_limit    = optional(number)
    burst_limit   = optional(number)
  }))
}

variable "default_rate_limit" {
  description = "Steady-state requests per second across the stage."
  type        = number
  default     = 100
}

variable "default_burst_limit" {
  description = "Burst capacity across the stage."
  type        = number
  default     = 200
}

variable "log_retention_days" {
  description = "Access log retention."
  type        = number
  default     = 14
}
