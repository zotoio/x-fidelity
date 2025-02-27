---
sidebar_position: 1
---

# CI/CD Integration Overview

x-fidelity can be integrated into your CI/CD pipelines to ensure consistent code quality checks across your projects. This guide explains how to set up x-fidelity in various CI/CD environments.

## General Setup

Regardless of your CI platform, the basic setup involves:

1. Installing x-fidelity
2. Configuring the environment
3. Running checks
4. Processing results

### Basic Installation

```bash
# Install x-fidelity globally
yarn global add x-fidelity
export PATH="$PATH:$(yarn global bin)"
```

### Environment Variables

Set up these environment variables in your CI environment:

```bash
# Required for OpenAI integration (optional)
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4

# For config server communication
XFI_SHARED_SECRET=your_shared_secret

# For self-signed certificates
NODE_TLS_REJECT_UNAUTHORIZED=0  # Only in trusted environments
```

### Basic Pipeline Step

```yaml
steps:
  - name: Run x-fidelity
    run: |
      yarn global add x-fidelity
      xfidelity . --configServer https://config-server.example.com
```

## Configuration Options

### Remote Config Server

Use a remote config server to centralize your rules:

```bash
xfidelity . --configServer https://config-server.example.com
```

### Local Configuration

For projects needing local config:

```bash
xfidelity . --localConfigPath ./config
```

### Custom Archetype

Specify a custom archetype:

```bash
xfidelity . --archetype java-microservice
```

### Plugin Loading

Plugins can be loaded in two ways:

1. **Via CLI option**:
```bash
xfidelity . -e xfi-plugin-name another-plugin
```

2. **Via archetype configuration**:
Plugins specified in the archetype's `plugins` array will be loaded automatically.

### Plugin Loading

Plugins can be loaded in two ways:

1. **Via CLI option**:
```bash
xfidelity . -e xfi-plugin-name another-plugin
```

2. **Via archetype configuration**:
Plugins specified in the archetype's `plugins` array will be loaded automatically.

## Exit Codes

x-fidelity uses these exit codes:

- `0`: Success - no issues found
- `1`: Fatal issues found or execution error
- Other codes: Various error conditions

## Best Practices

1. **Version Pinning**: Pin x-fidelity to specific versions in production pipelines
2. **Config Management**: Use a remote config server for centralized management
3. **Error Handling**: Add proper error handling in your pipeline
4. **Reporting**: Configure result reporting to your team's preferred channels
5. **Caching**: Cache dependencies to speed up pipeline execution

## Next Steps

- Set up [GitHub Actions](github-actions)
- Configure [GitLab CI](gitlab-ci)
- Integrate with [Jenkins](jenkins)
