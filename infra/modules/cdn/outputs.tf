output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "distribution_domain" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "web_bucket" {
  value = aws_s3_bucket.web.id
}

output "public_url" {
  value = "https://${local.custom_domain ? var.domain_name : aws_cloudfront_distribution.this.domain_name}"
}
