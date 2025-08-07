---
sidebar_position: 20
---

# Recipes

Copy‑paste commands for common scenarios.

## Monorepo root

```bash
xfidelity .
```

## JSON for CI pipelines

```bash
xfidelity . --output-format json --output-file xfi-results.json
```

## Targeted files (fast feedback)

```bash
xfidelity . --zap '["src/index.ts","src/app.ts"]'
```

## Remote configuration

```bash
xfidelity . --configServer http://localhost:8888
```

## GitHub‑hosted configuration

```bash
xfidelity . --githubConfigLocation https://github.com/org/repo/tree/main/xfi-config
```

## Start config server

```bash
xfidelity --mode server --port 8888
```
