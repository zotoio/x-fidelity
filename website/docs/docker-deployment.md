---
sidebar_position: 12
---

# Docker Deployment

This guide explains how to deploy x-fidelity's config server using Docker.

## Quick Start

1. Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /usr/src/app

# Generate self-signed certificate for HTTPS
RUN mkdir certs && \
    openssl req -x509 -newkey rsa:4096 -keyout certs/tls.key -out certs/tls.pem -days 365 -nodes \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Install x-fidelity
RUN yarn global add x-fidelity && \
    export PATH="$PATH:$(yarn global bin)"

# Create config directory
RUN mkdir config

# Set environment variables
ENV NODE_ENV=production
ENV XFI_LISTEN_PORT=8888
ENV CERT_PATH=/usr/src/app/certs

# Expose port
EXPOSE 8888

# Start config server
CMD ["xfidelity", "--mode", "server", "--port", "8888", "--localConfigPath", "/usr/src/app/config"]
```

2. Create a `docker-compose.yml`:

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

## Building and Running

### Using Docker Compose

```bash
# Build and start the server
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop the server
docker-compose down
```

### Using Docker Directly

```bash
# Build the image
docker build -t x-fidelity .

# Run the container
docker run -p 8888:8888 \
  -v $(pwd)/config:/usr/src/app/config \
  -e XFI_SHARED_SECRET=your_secret_here \
  x-fidelity
```

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'production' for production deployments
- `XFI_LISTEN_PORT`: Server port (default: 8888)
- `CERT_PATH`: Path to SSL certificates
- `XFI_SHARED_SECRET`: Shared secret for authentication
- `GITHUB_WEBHOOK_SECRET`: Secret for GitHub webhooks

### Volumes

Mount your configuration directory:
```yaml
volumes:
  - ./config:/usr/src/app/config
```

### SSL/TLS

The Dockerfile generates self-signed certificates. For production:
1. Mount your own certificates:
```yaml
volumes:
  - ./certs:/usr/src/app/certs
```

2. Update environment variables:
```yaml
environment:
  - CERT_PATH=/usr/src/app/certs
```

## Health Checks

Add health checks to your Docker Compose configuration:

```yaml
services:
  x-fidelity-server:
    # ... other configuration ...
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:8888/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Production Deployment

For production deployments:

1. Use proper SSL certificates
2. Set strong secrets
3. Configure proper logging
4. Set up monitoring
5. Use container orchestration
6. Implement backups
7. Set resource limits

Example production `docker-compose.yml`:

```yaml
services:
  x-fidelity-server:
    build: .
    ports:
      - 8888:8888
    volumes:
      - ./config:/usr/src/app/config
      - ./certs:/usr/src/app/certs
      - ./logs:/usr/src/app/logs
    environment:
      - NODE_ENV=production
      - XFI_LISTEN_PORT=8888
      - CERT_PATH=/usr/src/app/certs
      - XFI_SHARED_SECRET=${XFI_SHARED_SECRET}
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "https://localhost:8888/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

1. **Certificate Issues**:
   - Check certificate paths
   - Verify certificate permissions
   - For testing, set `NODE_TLS_REJECT_UNAUTHORIZED=0`

2. **Connection Issues**:
   - Verify port mappings
   - Check network configuration
   - Ensure firewall rules

3. **Volume Mounting**:
   - Check directory permissions
   - Verify absolute paths
   - Ensure SELinux context

4. **Resource Issues**:
   - Monitor container resources
   - Adjust resource limits
   - Check for memory leaks

## Next Steps

- Configure [GitHub Webhooks](github-webhooks)
- Set up [CI/CD Integration](ci-cd/overview)
- Implement [Telemetry](telemetry)
