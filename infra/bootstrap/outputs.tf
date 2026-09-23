output "state_bucket" {
  description = "Set as the TF_STATE_BUCKET GitHub repository variable."
  value       = aws_s3_bucket.state.id
}

output "plan_role_arn" {
  description = "Set as the AWS_PLAN_ROLE_ARN GitHub repository variable."
  value       = aws_iam_role.plan.arn
}

output "deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN GitHub repository variable."
  value       = aws_iam_role.deploy.arn
}
