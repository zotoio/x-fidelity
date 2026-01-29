#!/bin/bash
# Create CRUX distribution zip file
# Usage: bash .cursor/scripts/create-crux-zip.sh [output-dir]
#
# This script packages all CRUX-related files for distribution.
# Output: CRUX-Compress-v1.0.0.zip

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_DIR="${1:-$PROJECT_ROOT}"

# Version from CRUX.md frontmatter
VERSION="1.0.0"
ZIP_NAME="CRUX-Compress-v${VERSION}.zip"

cd "$PROJECT_ROOT"

echo "Creating CRUX distribution package..."
echo "Output: $OUTPUT_DIR/$ZIP_NAME"

# Create temp directory for staging
STAGING_DIR=$(mktemp -d)
trap "rm -rf $STAGING_DIR" EXIT

# Create directory structure
mkdir -p "$STAGING_DIR/.cursor/agents"
mkdir -p "$STAGING_DIR/.cursor/commands"
mkdir -p "$STAGING_DIR/.cursor/hooks"
mkdir -p "$STAGING_DIR/.cursor/rules"

# Copy core files
echo "Copying core files..."
cp CRUX.md "$STAGING_DIR/"

# Copy Cursor integration files
echo "Copying Cursor integration files..."
cp .cursor/crux-readme.md "$STAGING_DIR/.cursor/"
cp .cursor/crux-hooks.json "$STAGING_DIR/.cursor/hooks.json"

# Copy agent
cp .cursor/agents/crux-cursor-rule-manager.md "$STAGING_DIR/.cursor/agents/"

# Copy command
cp .cursor/commands/crux-compress.md "$STAGING_DIR/.cursor/commands/"

# Copy hook
cp .cursor/hooks/detect-crux-changes.sh "$STAGING_DIR/.cursor/hooks/"

# Copy always-applied rule
cp .cursor/rules/_CRUX-RULE.mdc "$STAGING_DIR/.cursor/rules/"

# Create the zip
echo "Creating zip archive..."
cd "$STAGING_DIR"
zip -r "$OUTPUT_DIR/$ZIP_NAME" . -x "*.DS_Store" -x "*__MACOSX*"

echo ""
echo "Done! Created: $OUTPUT_DIR/$ZIP_NAME"
echo ""
echo "Contents:"
unzip -l "$OUTPUT_DIR/$ZIP_NAME"
