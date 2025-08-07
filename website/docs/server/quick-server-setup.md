---
sidebar_position: 1
---

# Quick Server Setup

Spin up the config server locally.

## Docker Compose

```yaml
services:
  x-fidelity-server:
    image: node:22
    working_dir: /app
    volumes:
      - ./:/app
    command: bash -lc "yarn && yarn build && node packages/x-fidelity-cli/dist/index.js --mode server --port 8888"
    environment:
      - XFI_LISTEN_PORT=8888
      - XFI_SHARED_SECRET=changeme
    ports:
      - "8888:8888"
```

## cURL checks

```bash
# Archetype
curl -k https://localhost:8888/archetypes/node-fullstack

# With shared secret
curl -k -H 'x-shared-secret: changeme' https://localhost:8888/viewcache
```
