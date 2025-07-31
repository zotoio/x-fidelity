#!/bin/bash

# Local CI Simulation Script
# This script replicates the exact CI environment and commands locally

set -e  # Exit on any error

echo "🧹 Starting CI simulation with clean environment..."

# Step 1: Clean everything (simulate fresh CI environment)
echo "🧹 Cleaning all build artifacts and caches..."
yarn clean

# Step 2: Build all packages (exactly like CI)
echo "🔨 Building all packages without cache..."
yarn build

# Step 3: Lint (exactly like CI)
echo "🔍 Running linting..."
yarn lint

# Step 4: Type check (exactly like CI)
echo "📝 Running type checks..."
yarn check-types

# Step 5: Run tests with coverage (exactly like CI)
echo "🧪 Running tests with coverage..."
yarn test:coverage

echo "✅ CI simulation completed successfully!"
echo "🎉 All checks passed - this should work in CI!"