---
sidebar_position: 11
---

# Config Server

The x-fidelity config server provides centralized configuration management and real-time updates for your rules and archetypes.

## Overview

The config server:
- Serves archetype configurations
- Distributes rules
- Manages exemptions
- Collects telemetry
- Handles GitHub webhooks

## Server Setup

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
      - XFI_SHARED_SECRET=your_secret_here
```

### Manual Setup

```bash
xfidelity --mode server --port 8888
```

## API Endpoints

### Archetypes

- `GET /archetypes/:archetype`: Get archetype configuration
- `GET /archetypes/:archetype/rules`: Get rules for archetype
- `GET /archetypes/:archetype/rules/:rule`: Get specific rule
- `GET /archetypes/:archetype/exemptions`: Get exemptions

### Telemetry

- `POST /telemetry`: Submit telemetry data

### Cache Management

- `POST /clearcache`: Clear server cache
- `GET /viewcache`: View cache contents

### GitHub Webhooks

- `POST /github-config-update`: Update config from GitHub
- `POST /github-pull-request-check`: Check pull requests

## Security Features

### Authentication

Uses shared secret authentication:
```bash
export XFI_SHARED_SECRET=your_secret_here
```

### HTTPS/TLS

Supports HTTPS with:
- Self-signed certificates
- Custom certificates
- Certificate path configuration

### Rate Limiting

Configurable rate limiting:
- Default: 10,000 requests per minute
- Customizable window and limit
- IP-based tracking

## Caching

- In-memory caching
- Configurable TTL
- Cache invalidation on updates
- View cache contents

## Environment Variables

- `XFI_LISTEN_PORT`: Server port
- `CERT_PATH`: SSL certificate path
- `XFI_SHARED_SECRET`: Authentication secret
- `GITHUB_WEBHOOK_SECRET`: GitHub webhook secret
- `NODE_TLS_REJECT_UNAUTHORIZED`: Allow self-signed certs

## Best Practices

1. **Security**:
   - Use HTTPS in production
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

- Set up [Docker Deployment](docker-deployment)
- Configure [GitHub Webhooks](github-webhooks)
- Implement [Telemetry](telemetry)
