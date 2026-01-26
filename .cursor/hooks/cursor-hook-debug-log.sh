#!/bin/bash
# Cursor Hook Debug Logger (Non-Blocking)
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
#
# Note: Logging is non-blocking - response is returned immediately and
#       logging happens asynchronously in background

# ============================================================================
# Configuration
# ============================================================================

CURSOR_HOOK_DEBUG="${CURSOR_HOOK_DEBUG:-0}"
CURSOR_HOOK_DEBUG_DIR="${CURSOR_HOOK_DEBUG_DIR:-$HOME/cursor-debug}"

# ============================================================================
# Parse arguments
# ============================================================================

PHASE="${1:-unknown}"
HOOK_NAME="${2:-unknown}"

# ============================================================================
# Read input from stdin (must happen before any output)
# ============================================================================

INPUT=$(cat)

# ============================================================================
# Respond immediately - non-blocking
# ============================================================================

echo '{"continue": true}'

# ============================================================================
# Early exit if debug is disabled
# ============================================================================

if [[ "$CURSOR_HOOK_DEBUG" != "1" && "$CURSOR_HOOK_DEBUG" != "true" ]]; then
    exit 0
fi

# ============================================================================
# Fork logging to background (non-blocking)
# ============================================================================

(
    # Run all logging in a subshell that's detached from the parent
    
    # Extract session_id from input JSON, fallback to timestamp-based ID
    SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // .context.session_id // empty' 2>/dev/null || echo "")
    if [[ -z "$SESSION_ID" ]]; then
        SESSION_ID="$$-$(date +%s)"
    fi

    # Get repository name from git or current directory
    get_repo_name() {
        local repo_name
        repo_name=$(git config --get remote.origin.url 2>/dev/null | sed -e 's/.*\///' -e 's/\.git$//' || echo "")
        if [[ -z "$repo_name" ]]; then
            repo_name=$(git rev-parse --show-toplevel 2>/dev/null | xargs basename || echo "")
        fi
        if [[ -z "$repo_name" ]]; then
            repo_name=$(basename "$(pwd)")
        fi
        echo "$repo_name"
    }

    REPO_NAME=$(get_repo_name)

    # Setup log file path
    DATE_DIR=$(date +%Y-%m-%d)
    TIME_PREFIX=$(date +%H-%M)
    LOG_DIR="$CURSOR_HOOK_DEBUG_DIR/$REPO_NAME/$DATE_DIR"
    LOG_FILE="$LOG_DIR/${TIME_PREFIX}-hook-debug-${SESSION_ID}.log"

    # Create log directory
    mkdir -p "$LOG_DIR" 2>/dev/null || true

    # Validate input is JSON, wrap if not
    if echo "$INPUT" | jq -e . >/dev/null 2>&1; then
        INPUT_JSON="$INPUT"
    else
        INPUT_JSON=$(jq -n --arg raw "$INPUT" '{"raw_input": $raw}')
    fi

    # Create and write log entry
    TIMESTAMP=$(date -Iseconds)
    PHASE_UPPER=$(echo "$PHASE" | tr '[:lower:]' '[:upper:]')
    CWD=$(pwd)

    jq -n \
        --arg timestamp "$TIMESTAMP" \
        --arg phase "$PHASE_UPPER" \
        --arg hook_name "$HOOK_NAME" \
        --arg session_id "$SESSION_ID" \
        --arg repo "$REPO_NAME" \
        --arg cwd "$CWD" \
        --argjson data "$INPUT_JSON" \
        '{
            timestamp: $timestamp,
            phase: $phase,
            hook_name: $hook_name,
            session_id: $session_id,
            repo: $repo,
            cwd: $cwd,
            data: $data
        }' >> "$LOG_FILE" 2>/dev/null || true

) </dev/null >/dev/null 2>&1 &

# Disown to fully detach from parent process
disown 2>/dev/null || true

exit 0
