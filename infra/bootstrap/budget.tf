# Account-wide monthly cost guardrail. Lives in bootstrap (applied by an admin) because the
# CI deploy role deliberately has no billing permissions.
resource "aws_budgets_budget" "monthly" {
  name         = "${local.prefix}-monthly"
  budget_type  = "COST"
  limit_amount = tostring(var.monthly_budget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Track gross usage. With credits included (the default), AWS nets them out and the budget
  # would read ~$0 while the credits are being consumed, which defeats the purpose here.
  cost_types {
    include_credit = false
    include_refund = false
  }

  dynamic "notification" {
    for_each = {
      actual_50    = { threshold = 50, type = "ACTUAL" }
      actual_80    = { threshold = 80, type = "ACTUAL" }
      actual_100   = { threshold = 100, type = "ACTUAL" }
      forecast_100 = { threshold = 100, type = "FORECASTED" }
    }
    content {
      comparison_operator        = "GREATER_THAN"
      threshold                  = notification.value.threshold
      threshold_type             = "PERCENTAGE"
      notification_type          = notification.value.type
      subscriber_email_addresses = [var.budget_alert_email]
    }
  }
}
