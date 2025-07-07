#!/bin/bash
echo "🚀 Starting X-Fidelity Extension Development Environment..."
cd ../../ && yarn build && cd packages/x-fidelity-vscode && yarn dev:build && mkdir -p .vscode-test .vscode-test-profile && echo "✅ Ready! Press F5 in VSCode to debug"
