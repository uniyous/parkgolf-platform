#!/bin/bash
# ============================================================================
# NATS JetStream Initialization Script
# Creates Streams and Consumers for Park Golf Platform
# ============================================================================

set -e

# Configuration
NATS_URL="${NATS_URL:-nats://localhost:4222}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

echo "=================================================="
echo "NATS JetStream Initialization"
echo "Environment: $ENVIRONMENT"
echo "NATS URL: $NATS_URL"
echo "=================================================="

# Check if nats CLI is installed
if ! command -v nats &> /dev/null; then
    echo "Error: nats CLI is not installed"
    echo "Install with: brew install nats-io/nats-tools/nats"
    exit 1
fi

# Wait for NATS to be ready
echo "Waiting for NATS server..."
until nats server ping --server "$NATS_URL" &> /dev/null; do
    echo "  NATS not ready, retrying in 2s..."
    sleep 2
done
echo "NATS server is ready!"

# ============================================================================
# Stream: SERVICES (Request/Response)
# For microservice communication
# ============================================================================
echo ""
echo "Creating SERVICES stream..."

nats stream add SERVICES \
    --server "$NATS_URL" \
    --subjects "auth.*,auth.admin.*,users.*,course.*,hole.*,company.*,time-slot.*,booking.*" \
    --retention limits \
    --max-msgs 100000 \
    --max-bytes 1GB \
    --max-age 24h \
    --storage file \
    --replicas 1 \
    --discard old \
    --dupe-window 2m \
    --no-allow-rollup \
    --deny-delete \
    --deny-purge 2>/dev/null || echo "  Stream SERVICES already exists, updating..."

nats stream update SERVICES \
    --server "$NATS_URL" \
    --subjects "auth.*,auth.admin.*,users.*,course.*,hole.*,company.*,time-slot.*,booking.*" \
    --max-msgs 100000 \
    --max-bytes 1GB \
    --max-age 24h 2>/dev/null || true

echo "  SERVICES stream ready"

# ============================================================================
# Stream: NOTIFICATIONS (Pub/Sub - Work Queue)
# For async notification processing
# ============================================================================
echo ""
echo "Creating NOTIFICATIONS stream..."

nats stream add NOTIFICATIONS \
    --server "$NATS_URL" \
    --subjects "notification.>" \
    --retention work \
    --max-msgs 500000 \
    --max-bytes 2GB \
    --max-age 168h \
    --storage file \
    --replicas 1 \
    --discard old \
    --dupe-window 5m 2>/dev/null || echo "  Stream NOTIFICATIONS already exists, updating..."

nats stream update NOTIFICATIONS \
    --server "$NATS_URL" \
    --subjects "notification.>" \
    --max-msgs 500000 \
    --max-bytes 2GB \
    --max-age 168h 2>/dev/null || true

echo "  NOTIFICATIONS stream ready"

# ============================================================================
# Stream: EVENTS (Event Sourcing / Audit Log)
# For event history and replay
# ============================================================================
echo ""
echo "Creating EVENTS stream..."

nats stream add EVENTS \
    --server "$NATS_URL" \
    --subjects "events.>" \
    --retention limits \
    --max-msgs 1000000 \
    --max-bytes 5GB \
    --max-age 720h \
    --storage file \
    --replicas 1 \
    --discard old \
    --dupe-window 10m 2>/dev/null || echo "  Stream EVENTS already exists, updating..."

nats stream update EVENTS \
    --server "$NATS_URL" \
    --subjects "events.>" \
    --max-msgs 1000000 \
    --max-bytes 5GB \
    --max-age 720h 2>/dev/null || true

echo "  EVENTS stream ready"

# ============================================================================
# Consumers for NOTIFICATIONS stream
# ============================================================================
echo ""
echo "Creating consumers for NOTIFICATIONS stream..."

# Email notification consumer
nats consumer add NOTIFICATIONS email-worker \
    --server "$NATS_URL" \
    --filter "notification.email.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 5 \
    --wait 30s \
    --max-pending 100 \
    --pull 2>/dev/null || echo "  Consumer email-worker already exists"

# Push notification consumer
nats consumer add NOTIFICATIONS push-worker \
    --server "$NATS_URL" \
    --filter "notification.push.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 5 \
    --wait 30s \
    --max-pending 100 \
    --pull 2>/dev/null || echo "  Consumer push-worker already exists"

# SMS notification consumer
nats consumer add NOTIFICATIONS sms-worker \
    --server "$NATS_URL" \
    --filter "notification.sms.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 3 \
    --wait 30s \
    --max-pending 50 \
    --pull 2>/dev/null || echo "  Consumer sms-worker already exists"

# General notification consumer (for notify-service)
nats consumer add NOTIFICATIONS notify-service \
    --server "$NATS_URL" \
    --filter "notification.>" \
    --ack explicit \
    --deliver all \
    --max-deliver 5 \
    --wait 30s \
    --max-pending 200 \
    --pull 2>/dev/null || echo "  Consumer notify-service already exists"

echo "  Consumers ready"

# ============================================================================
# Verify Setup
# ============================================================================
echo ""
echo "=================================================="
echo "JetStream Setup Complete!"
echo "=================================================="
echo ""
echo "Streams:"
nats stream list --server "$NATS_URL"
echo ""
echo "Consumers in NOTIFICATIONS:"
nats consumer list NOTIFICATIONS --server "$NATS_URL"
echo ""
echo "Server Info:"
nats server info --server "$NATS_URL"
