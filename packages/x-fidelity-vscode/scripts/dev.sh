#!/bin/bash

# Exit on error
set -e

# Build x-fidelity first
echo "Building x-fidelity..."
cd ../x-fidelity
yarn build

# Return to vscode extension directory
cd ../x-fidelity-vscode

# Clean and build the extension
echo "Building VSCode extension..."
yarn clean
yarn build

# Create .vscode-test directory if it doesn't exist
mkdir -p .vscode-test

# Start the extension in development mode
echo "Starting VSCode extension in development mode..."
code --extensionDevelopmentPath=$PWD . 