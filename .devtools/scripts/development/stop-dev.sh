#!/bin/bash

# Park Golf Platform - Development Environment Stop Script

set -e

echo "🏌️ Park Golf Platform - Stopping Development Environment"
echo "======================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Stop tmux session
echo "Stopping development services..."
if tmux has-session -t parkgolf 2>/dev/null; then
    tmux kill-session -t parkgolf
    print_status "Stopped tmux session 'parkgolf'"
else
    print_warning "No tmux session 'parkgolf' found"
fi

# Stop Docker services
echo -e "\nStopping Docker infrastructure..."
if docker-compose down; then
    print_status "Docker services stopped"
else
    print_warning "Some Docker services may still be running"
fi

# Optional: Remove volumes (uncomment if you want to reset data)
# echo -e "\nRemoving volumes..."
# docker-compose down -v
# print_status "Volumes removed"

echo -e "\n✨ Development environment stopped!"
echo -e "\n🔧 To clean up completely (removes all data):"
echo -e "  ${YELLOW}docker-compose down -v --remove-orphans${NC}"

echo -e "\n🚀 To restart:"
echo -e "  ${YELLOW}./.devtools/scripts/development/start-infrastructure.sh${NC}"