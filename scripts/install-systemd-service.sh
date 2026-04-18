#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_TEMPLATE="$PROJECT_DIR/deploy/systemd/spinal-python.service"
SERVICE_TARGET="/etc/systemd/system/spinal-python.service"

if [ ! -f "$SERVICE_TEMPLATE" ]; then
    echo "❌ 未找到 systemd 服务模板: $SERVICE_TEMPLATE"
    exit 1
fi

install -m 644 "$SERVICE_TEMPLATE" "$SERVICE_TARGET"
systemctl daemon-reload
systemctl enable --now spinal-python.service
systemctl status spinal-python.service --no-pager
