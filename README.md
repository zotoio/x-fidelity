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

X-Fidelity is a comprehensive code quality analysis framework that provides opinionated adherence checks for your codebase. Available as both a command-line tool and VSCode extension, it offers a flexible, rule-based system with advanced plugin architecture to ensure your projects follow specific standards and best practices.

**📚 Full Documentation: https://zotoio.github.io/x-fidelity/**

## Quick Start

```bash
# Install CLI
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"

# Run analysis
xfidelity .

# OR install VSCode extension (recommended for development)
# Search for "X-Fidelity" in VSCode marketplace
```

## VSCode Extension

The X-Fidelity VSCode extension provides a comprehensive development experience with:

- **Real-time Analysis**: Auto-analysis on file save with configurable intervals
- **Integrated UI**: Activity bar integration with Issues and Control Center tree views  
- **Problems Panel**: Native VSCode diagnostics integration with accurate line/column positioning
- **Performance Monitoring**: Built-in performance metrics and optimization tools
- **Multiple CLI Sources**: Bundled CLI (zero-setup), global, local, or custom CLI binaries
- **47 Commands**: Comprehensive command palette integration
- **40+ Settings**: Granular configuration for analysis, performance, and UI behavior

**Development**: Press F5 in VSCode to launch the extension in debug mode.

## Monorepo Structure

- `packages/x-fidelity-core`: Core analysis engine with universal plugin logging system
- `packages/x-fidelity-vscode`: VSCode extension with 47 commands and comprehensive UI integration
- `packages/x-fidelity-cli`: Command-line interface with performance optimizations and caching
- `packages/x-fidelity-server`: Configuration server for centralized rule management
- `packages/x-fidelity-plugins`: 9 built-in plugins (AST, filesystem, dependency, OpenAI, etc.)
- `packages/x-fidelity-types`: Shared TypeScript types and interfaces
- `packages/x-fidelity-democonfig`: Demo configurations and example rules
- `packages/x-fidelity-fixtures`: Test fixtures and example projects

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
