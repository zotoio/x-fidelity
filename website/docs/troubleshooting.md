---
sidebar_position: 30
---

# Troubleshooting

## CLI

- No output? Ensure `.xfiResults/` exists and check `.xfiResults/XFI_RESULT.json`.
- Colors in logs look odd? Set `XFI_LOG_COLORS=false`.
- Target specific files using `--zap` to speed up analysis.

## VSCode

- Use `X‑Fidelity: Debug Diagnostics` for a health check.
- Ensure the workspace root is correct; the extension uses the first folder by default.
- Check `.xfiResults/XFI_RESULT.json` updated after running analysis.

## Server

- Use `-k` (insecure) with curl when testing self‑signed certs.
- Set `x-shared-secret` header for protected routes.
- Confirm `XFI_LISTEN_PORT` aligns with your port mapping.
