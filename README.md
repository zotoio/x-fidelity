# x-fidelity

```
╭────────────────────────────────╮
│                                │
│   ██╗  ██╗      ███████╗██╗    │
│   ╚██╗██╔╝      ██╔════╝██║    │
│    ╚███╔╝ █████╗█████╗  ██║    │
│    ██╔██╗ ╚════╝██╔══╝  ██║    │
│   ██╔╝ ██╗      ██║     ██║    │
│   ╚═╝  ╚═╝      ╚═╝     ╚═╝    │
╰────────────────────────────────╯
```

X-Fidelity is an advanced CLI tool and config server for opinionated framework adherence checks. It provides a flexible, rule-based system to ensure your projects follow specific standards and best practices.

**📚 Full Documentation: https://zotoio.github.io/x-fidelity/**

## Quick Start

```bash
# Install
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"

# Run analysis
xfidelity .
```

## VSCode Extension

The X-Fidelity VSCode extension provides a comprehensive development experience with real-time analysis, organized tree views, and professional debugging capabilities.

**Development**: Press F5 in VSCode to launch the extension in debug mode.

## Monorepo Structure

- `packages/x-fidelity-core`: Core analysis engine and utilities
- `packages/x-fidelity-vscode`: VSCode extension for X-Fidelity integration
- `packages/x-fidelity-cli`: Command-line interface
- `packages/x-fidelity-server`: Configuration server for centralized rule management
- `packages/x-fidelity-plugins`: Built-in plugins (AST analysis, filesystem checks, etc.)
- `packages/x-fidelity-types`: Shared TypeScript types
- `packages/x-fidelity-democonfig`: Demo configurations and rules
- `packages/x-fidelity-fixtures`: Test fixtures

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# VSCode extension development
yarn vscode:dev

# Run tests
yarn test
```

## Documentation

- **Getting Started**: https://zotoio.github.io/x-fidelity/getting-started
- **VSCode Extension**: https://zotoio.github.io/x-fidelity/vscode-extension
- **Configuration**: https://zotoio.github.io/x-fidelity/archetypes
- **CI/CD Integration**: https://zotoio.github.io/x-fidelity/ci-cd/overview
- **Plugin Development**: https://zotoio.github.io/x-fidelity/plugins/overview

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and our [website documentation](https://zotoio.github.io/x-fidelity/contributing).

## License

MIT License - see [LICENSE](LICENSE) file.
