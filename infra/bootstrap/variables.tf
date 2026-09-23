variable "region" {
  description = "Region for the state bucket."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Resource name prefix; must match the app stacks."
  type        = string
  default     = "url-shortener"
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the CI roles, as owner/name."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use the form owner/repo."
  }
}

variable "environments" {
  description = "GitHub environments allowed to deploy."
  type        = list(string)
  default     = ["dev", "prod"]
}

variable "github_repository_ids" {
  description = "Numeric owner/repo IDs. Needed when GitHub issues immutable subjects (repo:owner@id/repo@id:...)."
  type = object({
    owner_id = string
    repo_id  = string
  })
  default = null
}
