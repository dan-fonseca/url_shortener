output "public_url" {
  description = "Public base URL of the service."
  value       = module.cdn.public_url
}

output "api_endpoint" {
  description = "Direct API Gateway endpoint (prefer the public URL)."
  value       = module.api.api_endpoint
}

output "web_bucket" {
  description = "S3 bucket for the frontend build (upload under app/)."
  value       = module.cdn.web_bucket
}

output "distribution_id" {
  description = "CloudFront distribution ID (for cache invalidations)."
  value       = module.cdn.distribution_id
}

output "table_name" {
  value = aws_dynamodb_table.links.name
}

output "function_names" {
  value = { for k, f in module.function : k => f.function_name }
}
