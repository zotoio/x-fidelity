#!/bin/bash
# X-Fidelity Session Context Hook
# Reads AGENTS.md and injects it as context, plus notifies about pending CRUX compressions
# Triggered by: sessionStart hook

# Debug logging - write to a file to verify hook execution
echo "$(date '+%Y-%m-%d %H:%M:%S') - Hook executed" >> /tmp/xfi-hook-debug.log

# Read the input from stdin (Cursor sends JSON with session details)
read -r input

# Log the input received
echo "$(date '+%Y-%m-%d %H:%M:%S') - Input: $input" >> /tmp/xfi-hook-debug.log

# Read AGENTS.md content
AGENTS_CONTENT=$(cat AGENTS.md 2>/dev/null)

# Check for pending CRUX compressions and notify user (don't inject context)
PENDING_FILE=".cursor/hooks/pending-crux-compress.json"

if [[ -f "$PENDING_FILE" ]]; then
    pending_files=$(jq -r '.files | join(", ")' "$PENDING_FILE" 2>/dev/null)
    pending_count=$(jq -r '.files | length' "$PENDING_FILE" 2>/dev/null)
    # Ensure pending_count is a valid positive integer (default to 0 if empty/non-numeric)
    [[ "$pending_count" =~ ^[0-9]+$ ]] || pending_count=0
    if [[ -n "$pending_files" && "$pending_files" != "null" && "$pending_count" -gt 0 ]]; then
        # Log pending files
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Pending CRUX compression: $pending_files" >> /tmp/xfi-hook-debug.log
        
        # Create notification message
        notification_msg="$pending_count rule file(s) need CRUX compression: $pending_files. Run: /crux-compress ALL"
        
        # Try to notify user based on OS
        if command -v osascript &> /dev/null; then
            # macOS notification
            osascript -e "display notification \"$notification_msg\" with title \"X-Fidelity\" subtitle \"Pending CRUX Compression\"" 2>/dev/null &
        elif command -v notify-send &> /dev/null; then
            # Linux notification
            notify-send "X-Fidelity - Pending CRUX Compression" "$notification_msg" 2>/dev/null &
        fi
        
        # Also write to stderr so it appears in Hooks output channel
        echo "[X-Fidelity] Pending CRUX compression for: $pending_files" >&2
        echo "[X-Fidelity] Run: /crux-compress ALL" >&2
    fi
fi

# Use jq to properly construct the JSON response with escaped content (just AGENTS.md, no compression context)
jq -n \
  --arg content "$AGENTS_CONTENT" \
  '{
    "continue": true,
    "additional_context": ("If you have not done so already, please review the repository context from AGENTS.md:\n\n" + $content)
  }'
