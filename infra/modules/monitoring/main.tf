# Monitoring Module
# Multi-cloud abstraction for monitoring and alerting

terraform {
  required_version = ">= 1.0"
}

# ============================================================================
# Variables
# ============================================================================

variable "provider_type" {
  type        = string
  description = "Cloud provider: gcp, aws, azure"
  validation {
    condition     = contains(["gcp", "aws", "azure"], var.provider_type)
    error_message = "provider_type must be one of: gcp, aws, azure"
  }
}

variable "project_id" {
  type        = string
  default     = null
  description = "GCP Project ID"
}

variable "environment" {
  type        = string
  description = "Environment: dev, staging, prod"
}

variable "notification_channels" {
  type = map(object({
    type   = string # email, slack, pagerduty
    config = map(string)
  }))
  default     = {}
  description = "Notification channels for alerts"
}

variable "services" {
  type        = list(string)
  default     = []
  description = "List of Cloud Run services to monitor"
}

variable "latency_threshold_ms" {
  type        = number
  default     = 1000
  description = "Latency threshold in milliseconds"
}

variable "error_rate_threshold" {
  type        = number
  default     = 5
  description = "Error rate threshold in percentage"
}

variable "cpu_threshold" {
  type        = number
  default     = 80
  description = "CPU utilization threshold in percentage"
}

variable "memory_threshold" {
  type        = number
  default     = 80
  description = "Memory utilization threshold in percentage"
}

variable "enable_uptime_checks" {
  type        = bool
  default     = true
  description = "Enable uptime checks"
}

variable "uptime_check_urls" {
  type = map(object({
    url     = string
    timeout = optional(number, 10)
    period  = optional(number, 60)
  }))
  default     = {}
  description = "URLs for uptime checks"
}

# Azure specific
variable "azure_resource_group" {
  type        = string
  default     = null
  description = "Azure Resource Group name"
}

# ============================================================================
# GCP Cloud Monitoring
# ============================================================================

# Notification Channels
resource "google_monitoring_notification_channel" "channels" {
  for_each     = var.provider_type == "gcp" ? var.notification_channels : {}
  display_name = "${each.key}-${var.environment}"
  type         = each.value.type == "email" ? "email" : each.value.type == "slack" ? "slack" : "pagerduty"

  labels = each.value.type == "email" ? {
    email_address = each.value.config["email"]
  } : each.value.type == "slack" ? {
    channel_name = each.value.config["channel"]
  } : {}

  sensitive_labels {
    auth_token = each.value.type == "slack" ? lookup(each.value.config, "auth_token", null) : null
  }
}

# High Latency Alert
resource "google_monitoring_alert_policy" "high_latency" {
  for_each     = var.provider_type == "gcp" ? toset(var.services) : []
  display_name = "High Latency - ${each.value} (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run Request Latency"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${each.value}-${var.environment}\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.latency_threshold_ms

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [for ch in google_monitoring_notification_channel.channels : ch.id]

  alert_strategy {
    auto_close = "604800s" # 7 days
  }

  documentation {
    content   = "Service ${each.value} in ${var.environment} is experiencing high latency (>= ${var.latency_threshold_ms}ms at p95)"
    mime_type = "text/markdown"
  }

  enabled = var.environment == "prod"
}

# High Error Rate Alert
resource "google_monitoring_alert_policy" "high_error_rate" {
  for_each     = var.provider_type == "gcp" ? toset(var.services) : []
  display_name = "High Error Rate - ${each.value} (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run 5xx Error Rate"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${each.value}-${var.environment}\" metric.label.response_code_class=\"5xx\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = var.error_rate_threshold

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [for ch in google_monitoring_notification_channel.channels : ch.id]

  alert_strategy {
    auto_close = "604800s"
  }

  documentation {
    content   = "Service ${each.value} in ${var.environment} has a high error rate (>= ${var.error_rate_threshold}%)"
    mime_type = "text/markdown"
  }

  enabled = var.environment == "prod"
}

# Instance Count Alert (for scaling issues)
resource "google_monitoring_alert_policy" "max_instances" {
  for_each     = var.provider_type == "gcp" ? toset(var.services) : []
  display_name = "Max Instances Reached - ${each.value} (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run Instance Count"

    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${each.value}-${var.environment}\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 8 # Alert when approaching max (default max is 10)

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [for ch in google_monitoring_notification_channel.channels : ch.id]

  alert_strategy {
    auto_close = "604800s"
  }

  documentation {
    content   = "Service ${each.value} in ${var.environment} is approaching maximum instance count. Consider increasing max instances."
    mime_type = "text/markdown"
  }

  enabled = var.environment == "prod"
}

# Uptime Checks
resource "google_monitoring_uptime_check_config" "https" {
  for_each     = var.provider_type == "gcp" && var.enable_uptime_checks ? var.uptime_check_urls : {}
  display_name = "${each.key}-uptime-${var.environment}"
  timeout      = "${each.value.timeout}s"
  period       = "${each.value.period}s"

  http_check {
    path           = "/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(replace(each.value.url, "https://", ""), "/.*", "")
    }
  }

  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
}

# Uptime Check Alert
resource "google_monitoring_alert_policy" "uptime" {
  for_each     = var.provider_type == "gcp" && var.enable_uptime_checks ? var.uptime_check_urls : {}
  display_name = "Uptime Check Failed - ${each.key} (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Uptime check failure"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\" metric.label.check_id=\"${google_monitoring_uptime_check_config.https[each.key].uptime_check_id}\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.project_id", "resource.label.host"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [for ch in google_monitoring_notification_channel.channels : ch.id]

  alert_strategy {
    auto_close = "604800s"
  }

  enabled = var.environment == "prod"
}

# Dashboard
resource "google_monitoring_dashboard" "main" {
  count          = var.provider_type == "gcp" && length(var.services) > 0 ? 1 : 0
  dashboard_json = jsonencode({
    displayName = "Park Golf Platform - ${var.environment}"
    gridLayout = {
      columns = 2
      widgets = concat(
        # Request count widget
        [{
          title = "Request Count by Service"
          xyChart = {
            dataSets = [for svc in var.services : {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${svc}-${var.environment}\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        }],
        # Latency widget
        [{
          title = "Request Latency (p95)"
          xyChart = {
            dataSets = [for svc in var.services : {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${svc}-${var.environment}\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                    groupByFields    = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        }],
        # Instance count widget
        [{
          title = "Instance Count"
          xyChart = {
            dataSets = [for svc in var.services : {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${svc}-${var.environment}\""
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_MAX"
                    groupByFields    = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        }],
        # Error rate widget
        [{
          title = "Error Rate"
          xyChart = {
            dataSets = [for svc in var.services : {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"${svc}-${var.environment}\" metric.label.response_code_class=\"5xx\""
                  aggregation = {
                    alignmentPeriod    = "60s"
                    perSeriesAligner   = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        }]
      )
    }
  })
}

# ============================================================================
# Outputs
# ============================================================================

output "notification_channel_ids" {
  description = "Notification channel IDs"
  value = var.provider_type == "gcp" ? {
    for k, v in google_monitoring_notification_channel.channels : k => v.id
  } : {}
}

output "alert_policy_ids" {
  description = "Alert policy IDs"
  value = var.provider_type == "gcp" ? {
    latency   = { for k, v in google_monitoring_alert_policy.high_latency : k => v.id }
    error     = { for k, v in google_monitoring_alert_policy.high_error_rate : k => v.id }
    instances = { for k, v in google_monitoring_alert_policy.max_instances : k => v.id }
  } : {}
}

output "uptime_check_ids" {
  description = "Uptime check IDs"
  value = var.provider_type == "gcp" && var.enable_uptime_checks ? {
    for k, v in google_monitoring_uptime_check_config.https : k => v.uptime_check_id
  } : {}
}

output "dashboard_id" {
  description = "Dashboard ID"
  value       = var.provider_type == "gcp" && length(var.services) > 0 ? google_monitoring_dashboard.main[0].id : null
}
