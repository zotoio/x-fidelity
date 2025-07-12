#!/bin/bash

# X-Fidelity Nx Setup Script
# This script sets up Nx build orchestration for the monorepo

set -e

echo "🚀 Setting up Nx for X-Fidelity monorepo..."

# Change to project root
cd "$(dirname "$0")/.."

# Install Nx if not already installed
echo "📦 Installing Nx..."
yarn add -D -W nx@latest

# Create nx.json configuration
echo "⚙️ Creating nx.json configuration..."
cat > nx.json << 'EOF'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "parallel": 3
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": [
        "^build"
      ],
      "cache": true
    },
    "test": {
      "cache": true
    },
    "lint": {
      "cache": true
    }
  },
  "namedInputs": {
    "default": [
      "{projectRoot}/**/*",
      "sharedGlobals"
    ],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json"
    ]
  },
  "plugins": [
    {
      "plugin": "@nx/js",
      "options": {
        "buildTargetName": "build",
        "testTargetName": "test"
      }
    }
  ]
}
EOF

# Create project.json files for each package
echo "📋 Creating project configurations..."

# Types package (no dependencies)
mkdir -p packages/x-fidelity-types
cat > packages/x-fidelity-types/project.json << 'EOF'
{
  "name": "types",
  "projectType": "library",
  "sourceRoot": "packages/x-fidelity-types/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-types/dist",
        "main": "packages/x-fidelity-types/src/index.ts",
        "tsConfig": "packages/x-fidelity-types/tsconfig.json"
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-types/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-types/**/*.ts"]
      }
    }
  },
  "tags": ["scope:types"]
}
EOF

# Core package (depends on types)
mkdir -p packages/x-fidelity-core
cat > packages/x-fidelity-core/project.json << 'EOF'
{
  "name": "core",
  "projectType": "library",
  "sourceRoot": "packages/x-fidelity-core/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-core/dist",
        "main": "packages/x-fidelity-core/src/index.ts",
        "tsConfig": "packages/x-fidelity-core/tsconfig.json"
      },
      "dependsOn": ["types:build"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-core/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-core/**/*.ts"]
      }
    }
  },
  "tags": ["scope:core"]
}
EOF

# Plugins package (depends on types, core)
mkdir -p packages/x-fidelity-plugins
cat > packages/x-fidelity-plugins/project.json << 'EOF'
{
  "name": "plugins",
  "projectType": "library",
  "sourceRoot": "packages/x-fidelity-plugins/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-plugins/dist",
        "main": "packages/x-fidelity-plugins/src/index.ts",
        "tsConfig": "packages/x-fidelity-plugins/tsconfig.json"
      },
      "dependsOn": ["types:build", "core:build"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-plugins/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-plugins/**/*.ts"]
      }
    }
  },
  "tags": ["scope:plugins"]
}
EOF

# Server package (depends on types, core, plugins)
mkdir -p packages/x-fidelity-server
cat > packages/x-fidelity-server/project.json << 'EOF'
{
  "name": "server",
  "projectType": "library",
  "sourceRoot": "packages/x-fidelity-server/src",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-server/dist",
        "main": "packages/x-fidelity-server/src/index.ts",
        "tsConfig": "packages/x-fidelity-server/tsconfig.json"
      },
      "dependsOn": ["types:build", "core:build", "plugins:build"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-server/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-server/**/*.ts"]
      }
    }
  },
  "tags": ["scope:server"]
}
EOF

# CLI package (depends on types, core, plugins, server)
mkdir -p packages/x-fidelity-cli
cat > packages/x-fidelity-cli/project.json << 'EOF'
{
  "name": "cli",
  "projectType": "application",
  "sourceRoot": "packages/x-fidelity-cli/src",
  "targets": {
    "build": {
      "executor": "@nx/js:node",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-cli/dist",
        "main": "packages/x-fidelity-cli/src/index.ts",
        "tsConfig": "packages/x-fidelity-cli/tsconfig.json"
      },
      "dependsOn": ["types:build", "core:build", "plugins:build", "server:build"]
    },
    "build:esbuild": {
      "executor": "@nx/js:node",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-cli/dist",
        "main": "packages/x-fidelity-cli/src/index.ts",
        "tsConfig": "packages/x-fidelity-cli/tsconfig.json"
      },
      "dependsOn": ["build"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-cli/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-cli/**/*.ts"]
      }
    }
  },
  "tags": ["scope:cli"]
}
EOF

# VSCode package (depends on types, core, plugins, and CLI)
mkdir -p packages/x-fidelity-vscode
cat > packages/x-fidelity-vscode/project.json << 'EOF'
{
  "name": "vscode",
  "projectType": "application",
  "sourceRoot": "packages/x-fidelity-vscode/src",
  "targets": {
    "build": {
      "executor": "@nx/js:node",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-vscode/dist",
        "main": "packages/x-fidelity-vscode/src/extension.ts",
        "tsConfig": "packages/x-fidelity-vscode/tsconfig.json"
      },
      "dependsOn": ["types:build", "core:build", "plugins:build", "cli:build"]
    },
    "build:esbuild": {
      "executor": "@nx/js:node",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "packages/x-fidelity-vscode/dist",
        "main": "packages/x-fidelity-vscode/src/extension.ts",
        "tsConfig": "packages/x-fidelity-vscode/tsconfig.json"
      },
      "dependsOn": ["build"]
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "packages/x-fidelity-vscode/jest.config.js"
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["packages/x-fidelity-vscode/**/*.ts"]
      }
    }
  },
  "tags": ["scope:vscode"]
}
EOF

# Install required Nx plugins
echo "🔌 Installing Nx plugins..."
yarn add -D -W @nx/js @nx/jest @nx/eslint

# Update root package.json scripts to use Nx
echo "📝 Backing up original package.json..."
cp package.json package.json.backup

echo "📝 Updating root package.json scripts..."
# Use node to update the scripts while preserving existing structure
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update scripts to use Nx
pkg.scripts = {
  ...pkg.scripts,
  'build': 'nx run-many --target=build --all',
  'build:affected': 'nx affected --target=build',
  'test': 'nx run-many --target=test --all', 
  'test:affected': 'nx affected --target=test',
  'lint': 'nx run-many --target=lint --all',
  'lint:affected': 'nx affected --target=lint',
  'clean': 'nx reset && yarn workspaces run clean',
  'build:clean': 'yarn clean && yarn build',
  'build:graph': 'nx graph',
  'build:dep-graph': 'nx dep-graph',
  'affected:graph': 'nx affected:graph',
  'vscode:dev': 'nx run vscode:dev',
  'vscode:package': 'nx run vscode:package',
  'cli:build': 'nx run cli:build',
  'test:consistency': 'nx run core:test --testPathPatterns=consistencyTesting.test.ts',
  'test:consistency:quick': 'nx run core:build && cd packages/x-fidelity-core && node -e \"require(\\\"./dist/test-utils/consistencyTesting.js\\\").runManualConsistencyTest().catch(console.error)\"',
  'test:consistency:baseline': 'nx run core:build && cd packages/x-fidelity-core && node -e \"require(\\\"./dist/test-utils/consistencyTesting.js\\\").generateBaselineReport().then(r => require(\\\"fs\\\").writeFileSync(\\\"../../consistency-baseline.txt\\\", r))\"',
  'test:consistency:validate': 'nx run core:build && cd packages/x-fidelity-core && node dist/test-utils/consistencyTestingCLI.js validate'
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

echo "✅ Nx setup complete!"
echo ""
echo "🎉 Available commands:"
echo "  yarn build              - Build all packages in dependency order"
echo "  yarn build:affected     - Build only affected packages"
echo "  yarn test               - Run all tests"
echo "  yarn test:affected      - Run tests for affected packages"
echo "  yarn lint               - Lint all packages"
echo "  yarn lint:affected      - Lint only affected packages"
echo "  yarn build:graph        - View build dependency graph"
echo "  yarn affected:graph     - View affected packages graph"
echo ""
echo "🚀 Try running: yarn build:graph to see the dependency visualization!" 