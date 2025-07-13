---
sidebar_position: 9
---

# Remote Configuration

x-fidelity supports centralized configuration management through a remote config server.

## Overview

Remote configuration provides:
- Centralized management
- Real-time updates
- Consistent rules
- Telemetry collection
- GitHub webhook integration

## Config Server Setup

### Using Docker

```yaml
services:
  x-fidelity-server:
    build: .
    ports:
      - 8888:8888
    volumes:
      - ./config:/usr/src/app/config
    environment:
      - NODE_ENV=production
      - XFI_LISTEN_PORT=8888
      - CERT_PATH=/usr/src/app/certs
```

### Manual Setup

```bash
# Start config server
xfidelity --mode server --port 8888
```

## Client Configuration

### Basic Usage

```bash
xfidelity . --configServer https://config-server.example.com
```

### With Authentication

```bash
export XFI_SHARED_SECRET=your_secret
xfidelity . --configServer https://config-server.example.com
```

## Server Features

### API Endpoints

- `/archetypes/:archetype`: Get archetype configuration
- `/archetypes/:archetype/rules`: Get rules for archetype
- `/archetypes/:archetype/rules/:rule`: Get specific rule
- `/archetypes/:archetype/exemptions`: Get exemptions
- `/telemetry`: Receive telemetry data
- `/github-config-update`: GitHub webhook endpoint

### Caching

- In-memory caching
- Configurable TTL
- Cache invalidation on updates
- View cache contents

### Security

- HTTPS/TLS support
- Shared secret authentication
- Rate limiting
- Security headers

## Environment Variables

- `XFI_LISTEN_PORT`: Server port
- `CERT_PATH`: SSL certificate path
- `XFI_SHARED_SECRET`: Authentication secret
- `GITHUB_WEBHOOK_SECRET`: GitHub webhook secret

## Best Practices

1. **Security**: 
   - Use HTTPS
   - Set strong secrets
   - Enable authentication
   - Configure rate limits

2. **Performance**:
   - Enable caching
   - Set appropriate TTL
   - Monitor server load
   - Scale as needed

3. **Monitoring**:
   - Collect telemetry
   - Monitor errors
   - Track usage
   - Set up alerts

4. **Maintenance**:
   - Regular updates
   - Backup configurations
   - Monitor disk space
   - Review logs

## Next Steps

- Set up [GitHub Webhooks](github-webhook-endpoints)
- Configure [CI/CD Integration](ci-cd/overview)
- Implement [Telemetry](telemetry)
