---
sidebar_position: 1
---

# 5‑Minute Quickstart

Get X‑Fidelity running and see results in minutes.

## 1. Install and run

```bash
# From your project root
yarn dlx x-fidelity --help  # or install globally: yarn global add x-fidelity

# Analyze current directory
xfidelity .
```

- Results are written to `.xfiResults/`
- Latest results: `.xfiResults/XFI_RESULT.json` (never deleted)

## 2. View results in VSCode

1. Install the "X‑Fidelity" VSCode extension
2. Open your project
3. Run: `Ctrl+Shift+P` → `X‑Fidelity: Run Analysis Now`
4. Open the Problems panel and X‑Fidelity sidebar

## 3. Common commands

```bash
# Monorepo root (workspace root)
xfidelity .

# JSON for CI and save to file
xfidelity . --output-format json --output-file xfi-results.json

# Targeted analysis on specific files (fast feedback)
xfidelity . --zap '["src/index.ts","src/app.ts"]'

# Use a remote config server
xfidelity . --configServer http://localhost:8888

# Use a GitHub-hosted config tree
xfidelity . --githubConfigLocation https://github.com/org/repo/tree/main/xfi-config

# Start the config server (HTTPS with certs if available)
xfidelity --mode server --port 8888
```

## 4. Next steps

- Understand [Result Files & Conventions](./result-files-and-conventions)
- Configure [Local Configuration](./local-config) or [Remote Configuration](./remote-config)
- Build your first [Rule](./rules/hello-rule) or [Plugin](./plugins/hello-plugin)
