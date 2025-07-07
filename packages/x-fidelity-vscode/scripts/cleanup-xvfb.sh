#!/bin/bash

# Cleanup script for xvfb testing environment
echo "🧹 Cleaning up xvfb testing environment..."

# Kill Xvfb processes
if [ -f /tmp/xvfb.pid ]; then
    XVFB_PID=$(cat /tmp/xvfb.pid)
    if kill $XVFB_PID 2>/dev/null; then
        echo "✅ Stopped Xvfb process $XVFB_PID"
    else
        echo "⚠️ Xvfb process $XVFB_PID was not running"
    fi
    rm -f /tmp/xvfb.pid
fi

# Kill any remaining Xvfb processes
pkill -f "Xvfb :99" || true

# Clean up test directories and files
rm -rf /tmp/vscode-test-user-data
rm -rf /tmp/.X99-lock

echo "✅ xvfb cleanup completed" 