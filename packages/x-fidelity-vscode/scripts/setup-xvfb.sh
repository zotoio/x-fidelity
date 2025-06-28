#!/bin/bash

# Setup script for xvfb testing environment
set -e

echo "🔧 Setting up xvfb testing environment..."

# Create necessary directories
mkdir -p /tmp/vscode-test-user-data
mkdir -p /tmp/.X11-unix

# Set proper permissions
chmod 1777 /tmp/.X11-unix

# Clean up any existing X server processes
pkill -f "Xvfb :99" || true

# Wait a moment for cleanup
sleep 1

# Start Xvfb with proper configuration
echo "🚀 Starting Xvfb server..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset -nolisten tcp -dpi 96 &
XVFB_PID=$!

# Wait for X server to start
sleep 2

# Export display
export DISPLAY=:99

# Verify X server is running
if xdpyinfo -display :99 >/dev/null 2>&1; then
    echo "✅ Xvfb server is running on display :99"
else
    echo "❌ Failed to start Xvfb server"
    kill $XVFB_PID 2>/dev/null || true
    exit 1
fi

# Set up environment variables
export XDG_RUNTIME_DIR=/tmp
export TMPDIR=/tmp
export XVFB=1

echo "🎯 xvfb environment ready!"
echo "DISPLAY=$DISPLAY"
echo "XVFB_PID=$XVFB_PID"

# Save PID for cleanup
echo $XVFB_PID > /tmp/xvfb.pid

echo "💡 To stop xvfb later, run: kill \$(cat /tmp/xvfb.pid)" 