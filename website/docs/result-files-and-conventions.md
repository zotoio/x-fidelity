---
sidebar_position: 12
---

# Result Files & Conventions

X-Fidelity writes analysis outputs and logs to a dedicated directory in your workspace. This page documents the conventions and guarantees around those files.

## Directory

- Location: `.xfiResults/` at your workspace root
- Git ignore: The CLI will ensure `.xfiResults/` is added to `.gitignore` where possible

## Files

- `XFI_RESULT.json`
  - Always present after analysis
  - Continuously updated with the latest results
  - Never deleted by cleanup routines
- `xfi-report-{timestamp}.json` and `xfi-report-{timestamp}.md`
  - Timestamped reports for history and sharing
  - Subject to retention/cleanup policies
- `structured-output.json`
  - Written when `--output-format json` is used without `--output-file`
- `x-fidelity.log`
  - Created when running the CLI with `--enable-file-logging`

## Guarantees

- `XFI_RESULT.json` is treated as the canonical latest results file and is never removed by cleanup.
- Timestamped reports are created for each run when reporting is enabled and may be cleaned up based on retention.
- The VSCode extension reads `XFI_RESULT.json` directly and may also display Markdown reports if available.

## Best Practices

- Do not commit `.xfiResults/` to version control
- Use `XFI_RESULT.json` as the integration point for automation
- Configure retention in the VSCode extension to manage historical reports
- Use `--output-file` when you need results in a specific path outside `.xfiResults/`
