---
sidebar_position: 8
---

# Environment Variables

x-fidelity supports various environment variables to configure its behavior. This guide explains each available option.

## Core Configuration

### OpenAI Integration
```bash
# Your OpenAI API key for AI-powered analysis
OPENAI_API_KEY=your_api_key_here

# The OpenAI model to use (default: 'gpt-4o')
OPENAI_MODEL=gpt-4o
```

### Server Configuration
```bash
# The port for the config server to listen on (default: 8888)
XFI_LISTEN_PORT=8888

# Path to SSL certificates for HTTPS config server
CERT_PATH=/path/to/certs

# Allow self-signed certificates (use with caution)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Security
```bash
# Shared secret for securing telemetry and certain server routes
XFI_SHARED_SECRET=your_shared_secret_here

# Secret for GitHub webhook endpoints
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
```

### Logging
```bash
# Set logging level (default: 'info')
XFI_LOG_LEVEL=debug

# Disable colored output in CLI logs (default: enabled)
XFI_LOG_COLORS=false
```

The `XFI_LOG_COLORS` environment variable controls whether CLI output includes ANSI color codes. This is useful in CI/CD, when redirecting logs to files, or in terminals that don't support colors. The VSCode extension disables colors when spawning the CLI.

## Usage Examples

### Basic Setup
```bash
export OPENAI_API_KEY=your_api_key_here
export XFI_SHARED_SECRET=your_shared_secret_here
xfidelity .
```

### Server Mode with SSL
```bash
export XFI_LISTEN_PORT=9999
export CERT_PATH=/etc/ssl/certs
export XFI_SHARED_SECRET=your_shared_secret_here
xfidelity --mode server
```

### Development Setup
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
export XFI_LOG_LEVEL=debug
xfidelity . --configServer https://localhost:8888
```

## Best Practices

1. **Security**:
   - Never commit environment variables to version control
   - Use strong, unique secrets
   - Rotate secrets regularly
   - Use different secrets for development and production

2. **Configuration Management**:
   - Use a `.env` file for local development
   - Use CI/CD secrets for production
   - Document all required variables
   - Provide example values

3. **SSL/TLS**:
   - Always use HTTPS in production
   - Only disable certificate verification in development
   - Use proper certificates in production
   - Keep certificates up to date

4. **Logging**:
   - Use appropriate log levels
   - Enable debug logging when needed
   - Monitor log output
   - Rotate log files

## Next Steps

- Set up [Local Configuration](local-config)
- Configure [Remote Configuration](remote-config)
- Learn about [OpenAI Integration](openai-integration)
