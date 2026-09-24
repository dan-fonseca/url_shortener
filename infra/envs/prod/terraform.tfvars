# Prod: protected state, backups, longer log retention.
deletion_protection    = true
point_in_time_recovery = true
log_retention_days     = 30
log_level              = "info"
create_rate_limit      = 10
create_burst_limit     = 20

# domain_name    = "go.example.com"
# hosted_zone_id = "Z0123456789ABCDEFGHIJ"
