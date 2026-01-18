---
sidebar_position: 2
---

# Getting Started

This guide will help you get up and running with X-Fidelity quickly. X-Fidelity is available as both a command-line tool and a VSCode extension.

## Choose Your Interface

### VSCode Extension (Recommended for Development)

The VSCode extension provides the most comprehensive development experience with real-time analysis, visual tree views, and integrated debugging.

**Quick Start:**
1. Clone the repository: `git clone https://github.com/zotoio/x-fidelity.git`
2. Install dependencies: `yarn install`
3. Build packages: `yarn build`
4. Launch extension: `yarn vscode:dev`

[→ Learn more about the VSCode Extension](./vscode-extension/overview)

### Command Line Interface

The CLI provides programmatic access and is perfect for CI/CD integration and scripting.

**Quick Start:**
1. Install: `yarn global add x-fidelity`
2. Set PATH: `export PATH="$PATH:$(yarn global bin)"`
3. Run analysis: `xfidelity .`

## CLI Installation

Install x-fidelity using Node.js 18+ and Yarn:

```bash
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

For persistent access, add the PATH line to your `~/.bashrc` or `~/.zshrc` file.

## Quick Start with CLI

1. **Run with demo configuration** in your project directory:

```bash
xfidelity .
```

2. **View available options**:

```bash
xfidelity --help
```

3. **Analyze specific project types**:

```bash
# For Node.js/TypeScript projects
xfidelity . -a node-fullstack

# For Java microservices
xfidelity . -a java-microservice
```

## Command Line Options

```bash
Options:
  -d, --dir <directory>                   code directory to analyze
  -a, --archetype <archetype>             archetype to use (default: "node-fullstack")
  -c, --configServer <configServer>       config server URL
  -o, --openaiEnabled <boolean>           enable OpenAI analysis
  -t, --telemetryCollector <url>          telemetry collector URL
  -m, --mode <mode>                       'client' or 'server' (default: "client") 
  -p, --port <port>                       server port (default: "8888")
  -l, --localConfigPath <path>            path to local config
  -j, --jsonTTL <minutes>                 server cache TTL (default: "10")
  -e, --extensions <modules...>           space-separated plugin modules
  -x, --examine                           validate archetype config only
  -v, --version                           output version number
  -h, --help                              display help
```

**Note:** Plugins can be loaded in two ways:
1. Via the `-e` option (CLI-specified plugins)
2. Via the `plugins` array in your archetype configuration

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: OpenAI model to use (default: 'gpt-4')
- `XFI_LISTEN_PORT`: Config server port
- `CERT_PATH`: SSL certificate path
- `NODE_TLS_REJECT_UNAUTHORIZED`: Allow self-signed certs
- `XFI_SHARED_SECRET`: Shared secret for security
- `XFI_LOG_COLOR`: Set to 'false' to disable colored output in logs
- `NOTIFICATIONS_ENABLED`: Enable notification system
- `NOTIFICATION_PROVIDERS`: Comma-separated list of notification providers to use
- `CODEOWNERS_PATH`: Path to CODEOWNERS file (default: .github/CODEOWNERS)
- `CODEOWNERS_ENABLED`: Enable code owners integration

## Example Commands

```bash
# Analyze current directory
xfidelity .

# Use specific archetype
xfidelity . -a java-microservice

# Use remote config server
xfidelity . -c https://config-server.example.com

# Enable OpenAI analysis
xfidelity . -o true

# Run as config server
xfidelity -m server -p 9999

# Use local config
xfidelity . -l /path/to/config

# Load plugins
xfidelity . -e plugin1 plugin2
```

## Monorepo Structure

X-Fidelity is organized as a monorepo with the following packages:

- **`x-fidelity-core`**: Core analysis engine and utilities
- **`x-fidelity-vscode`**: VSCode extension for integrated development
- **`x-fidelity-cli`**: Command-line interface
- **`x-fidelity-server`**: Configuration server for centralized rule management
- **`x-fidelity-plugins`**: Built-in plugins (AST, filesystem, dependency analysis, etc.)
- **`x-fidelity-types`**: Shared TypeScript type definitions
- **`x-fidelity-democonfig`**: Demo configurations and example rules
- **`x-fidelity-fixtures`**: Test fixtures and example projects

## Development Setup

For contributing to X-Fidelity or extending its functionality:

```bash
# Clone the repository
git clone https://github.com/zotoio/x-fidelity.git
cd x-fidelity

# Install all dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# VSCode extension development
yarn vscode:dev

# Package the VSCode extension
yarn vscode:package
```

## Configuration Options

### Local Configuration

Create a `.xfi-config.json` file in your project root for project-specific settings:

```json
{
  "sensitiveFileFalsePositives": [
    "path/to/exclude/file.js"
  ],
  "additionalPlugins": [
    "xfiPluginSimpleExample"
  ]
}
```

### Remote Configuration

Use a configuration server for centralized rule management:

```bash
# Connect to remote config server
xfidelity . -c https://config-server.example.com

# Run your own config server
xfidelity -m server -p 8888 -l /path/to/config
```

## Next Steps

### For Developers
- [VSCode Extension Guide](./vscode-extension/overview) - Comprehensive development experience
- [Local Configuration](./local-config) - Project-specific setup
- [Plugin Development](./plugins/overview) - Creating custom plugins

### For Teams
- [Remote Configuration](./remote-config) - Centralized rule management
- [CI/CD Integration](./ci-cd/overview) - Automated analysis in pipelines
- [Config Server Setup](./config-server) - Hosting your own configuration server

### Core Concepts
- [Archetypes](./archetypes) - Project templates and rule sets
- [Rules](./rules) - Define your code quality standards
- [Rule Builder](https://zotoio.github.io/x-fidelity/rule-builder/) - Create rules visually with the interactive GUI
- [Facts and Operators](./facts) - Understanding the analysis engine
