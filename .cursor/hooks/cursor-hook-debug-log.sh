#!/bin/bash
# Cursor Hook Debug Logger
# Logs all hook input/output fields as JSON for debugging purposes
#
# Usage: cursor-hook-debug-log.sh <phase> <hook_name>
#   phase: "start" or "end"
#   hook_name: name of the lifecycle hook (e.g., "sessionStart", "preToolUse")
#
# Configuration:
#   CURSOR_HOOK_DEBUG=1          - Enable debug logging (default: disabled)
#   CURSOR_HOOK_DEBUG_DIR        - Override log directory (default: ~/cursor-debug)
#
# Log format: ~/cursor-debug/[repo]/[yyyy-mm-dd]/[hh-mm]-hook-debug-[session_id].log

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Check if debug logging is enabled (default: disabled)
CURSOR_HOOK_DEBUG="${CURSOR_HOOK_DEBUG:-0}"

# Base directory for logs
CURSOR_HOOK_DEBUG_DIR="${CURSOR_HOOK_DEBUG_DIR:-$HOME/cursor-debug}"

# ============================================================================
# Parse arguments
# ============================================================================

PHASE="${1:-unknown}"
HOOK_NAME="${2:-unknown}"

# ============================================================================
# Read input from stdin
# ============================================================================

# Always read input to prevent blocking, even if debug is disabled
INPUT=$(cat)

# ============================================================================
# Early exit if debug is disabled - just pass through
# ============================================================================

if [[ "$CURSOR_HOOK_DEBUG" != "1" && "$CURSOR_HOOK_DEBUG" != "true" ]]; then
    # Pass through the input unchanged with continue: true
    echo '{"continue": true}'
    exit 0
fi

# ============================================================================
# Extract session information from input
# ============================================================================

# Try to extract session_id from input JSON, fallback to process ID
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // .context.session_id // empty' 2>/dev/null || echo "")
if [[ -z "$SESSION_ID" ]]; then
    # Use a combination of date and random for unique session identification
    SESSION_ID="$$-$(date +%s)"
fi

# Get repository name from git or current directory
get_repo_name() {
    local repo_name
    # Try git remote first
    repo_name=$(git config --get remote.origin.url 2>/dev/null | sed -e 's/.*\///' -e 's/\.git$//' || echo "")
    if [[ -z "$repo_name" ]]; then
        # Try git directory name
        repo_name=$(git rev-parse --show-toplevel 2>/dev/null | xargs basename || echo "")
    fi
    if [[ -z "$repo_name" ]]; then
        # Fallback to current directory
        repo_name=$(basename "$(pwd)")
    fi
    echo "$repo_name"
}

REPO_NAME=$(get_repo_name)

# ============================================================================
# Setup log file path
# ============================================================================

DATE_DIR=$(date +%Y-%m-%d)
TIME_PREFIX=$(date +%H-%M)

LOG_DIR="$CURSOR_HOOK_DEBUG_DIR/$REPO_NAME/$DATE_DIR"
LOG_FILE="$LOG_DIR/${TIME_PREFIX}-hook-debug-${SESSION_ID}.log"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# ============================================================================
# Logging functions
# ============================================================================

log_entry() {
    local phase="$1"
    local hook_name="$2"
    local data="$3"
    local timestamp
    timestamp=$(date -Iseconds)
    
    # Create structured log entry
    local log_entry
    log_entry=$(jq -n \
        --arg timestamp "$timestamp" \
        --arg phase "$phase" \
        --arg hook_name "$hook_name" \
        --arg session_id "$SESSION_ID" \
        --arg repo "$REPO_NAME" \
        --arg cwd "$(pwd)" \
        --argjson data "$data" \
        '{
            timestamp: $timestamp,
            phase: $phase,
            hook_name: $hook_name,
            session_id: $session_id,
            repo: $repo,
            cwd: $cwd,
            data: $data
        }' 2>/dev/null || echo "{\"error\": \"failed to create log entry\", \"raw\": \"$data\"}")
    
    # Append to log file
    echo "$log_entry" >> "$LOG_FILE"
}

# ============================================================================
# Validate and parse input
# ============================================================================

# Ensure input is valid JSON, wrap if not
if echo "$INPUT" | jq -e . >/dev/null 2>&1; then
    INPUT_JSON="$INPUT"
else
    INPUT_JSON=$(jq -n --arg raw "$INPUT" '{"raw_input": $raw}')
fi

# ============================================================================
# Log based on phase
# ============================================================================

case "$PHASE" in
    start)
        log_entry "START" "$HOOK_NAME" "$INPUT_JSON"
        ;;
    end)
        log_entry "END" "$HOOK_NAME" "$INPUT_JSON"
        ;;
    *)
        log_entry "UNKNOWN" "$HOOK_NAME" "$INPUT_JSON"
        ;;
esac

# ============================================================================
# Pass through - don't modify the hook behavior
# ============================================================================

echo '{"continue": true}'
