---
sidebar_position: 14
---

# Contributing

We welcome contributions to x-fidelity! This guide explains how to contribute to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Install dependencies:
```bash
yarn install
```
4. Create a new branch for your feature/fix

## Development Workflow

1. Make your changes
2. Add/update tests
3. Run tests:
```bash
yarn test
```
4. Lint code:
```bash
yarn lint
```
5. Use conventional commits:
```bash
yarn commit
```

## Pull Request Process

1. Push changes to your fork
2. Create a pull request
3. Include:
   - Clear description
   - Motivation for changes
   - Impact assessment
   - Screenshots/examples if relevant

## Code Standards

- Follow TypeScript best practices
- Add JSDoc comments
- Write unit tests
- Update documentation
- Use conventional commits

## Documentation

When adding features, update:
- README.md
- API documentation
- Website documentation
- Code comments

## Testing

Run the test suite:
```bash
yarn test
```

Run specific tests:
```bash
yarn test path/to/test
```

## Releasing

Releases are automated via GitHub Actions:
1. Merge to main
2. CI runs tests
3. Semantic release creates tag
4. Package published to npm

## Getting Help

- Open an issue
- Start a discussion
- Join our community

See the [Code of Conduct](CODE_OF_CONDUCT.md) for community guidelines.
