#!/bin/bash
# X-Fidelity Session Context Hook
# Reads AGENTS.md and injects it as context on first prompt submission

# Debug logging - write to a file to verify hook execution
echo "$(date '+%Y-%m-%d %H:%M:%S') - Hook executed" >> /tmp/xfi-hook-debug.log

# Read the input from stdin (Cursor sends JSON with prompt details)
read -r input

# Log the input received
echo "$(date '+%Y-%m-%d %H:%M:%S') - Input: $input" >> /tmp/xfi-hook-debug.log

# Read AGENTS.md content
AGENTS_CONTENT=$(cat AGENTS.md 2>/dev/null)

# Use jq to properly construct the JSON response with escaped content
jq -n \
  --arg content "$AGENTS_CONTENT" \
  '{
    "continue": true,
    "additional_context": ("If you have not done so already, please review the repository context from AGENTS.md:\n\n" + $content)
  }'
