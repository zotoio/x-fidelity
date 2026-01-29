# Topic: Documentation Structure

## Fact: X-Fidelity Has Four Primary Documentation Locations
### Modified: 2026-01-29
### Priority: H

X-Fidelity documentation is organized across four main locations, each serving a specific purpose:

1. **Root README.md** - Primary entry point for developers and users. Contains installation instructions, quick start, key features, architecture diagrams, and comprehensive usage documentation. This is the first document most users encounter.

2. **website/** - Docusaurus-based documentation site published to GitHub Pages at `https://zotoio.github.io/x-fidelity/`. Contains structured guides, tutorials, and reference documentation.

3. **AGENTS.md** - AI agent guidance file providing instructions for Cursor, Claude, and other agents. Contains repository structure, common commands, high-level architecture, key concepts, and subagent definitions.

4. **Package-level READMEs** - Each package in `packages/` has its own README.md with package-specific documentation (installation, features, configuration, troubleshooting).

The documentation hierarchy flows: README.md (overview) → website (detailed guides) → AGENTS.md (AI context) → package READMEs (package-specific).

### References
1. [README.md](../../README.md)
2. [AGENTS.md](../../AGENTS.md)
3. [website/](../../website/)
4. [packages/x-fidelity-vscode/README.md](../../packages/x-fidelity-vscode/README.md)

---

## Fact: AGENTS.md Serves As AI Agent Instruction Manual
### Modified: 2026-01-29
### Priority: H

`AGENTS.md` is a critical documentation file that provides structured guidance for AI agents working with the codebase. Key sections include:

- **CRUX Notation** - Rules for handling compressed semantic notation
- **Repository Structure** - Overview of monorepo packages and their purposes
- **Common Commands** - Standard yarn workspace commands for building, testing, linting
- **High-Level Architecture** - Core engine, plugin system, VSCode extension, config server
- **Key Concepts** - Archetypes, Rules, Facts, Operators
- **Development Guidelines** - Package management, testing strategy, code quality
- **SME Subagents Table** - 13 specialized agents with domains and auto-triggers
- **Knowledge Management** - Agent knowledge storage in `knowledge/` directory

When code changes affect architecture, commands, or structure, AGENTS.md must be updated to maintain AI agent effectiveness.

### References
1. [AGENTS.md](../../AGENTS.md)
2. [.cursor/agents/](../../.cursor/agents/)

---

## Fact: Cursor Rules Provide Context-Specific Agent Guidance
### Modified: 2026-01-29
### Priority: M

The `.cursor/rules/` directory contains 23 rule files that provide agent guidance in two formats:

1. **Standard MDC Rules** (`.mdc` files) - Human-readable Markdown with frontmatter
2. **CRUX Compressed Rules** (`.crux.mdc` files) - Token-efficient compressed versions

Key rules include:
- `development-workflow.mdc` - Package manager (yarn), testing requirements, commands
- `monorepo-structure.mdc` - Package organization and file locations
- `subagent-delegation.mdc` - When to invoke specialized subagents
- `core-tenets.mdc` - Fundamental development principles
- `_CRUX-RULE.mdc` - CRUX notation decompression instructions
- `plugin-architecture.mdc` - Plugin system patterns
- `security-path-validation.mdc` - Security requirements

Always-applied rules are automatically loaded; agent-requestable rules require explicit reading.

### References
1. [.cursor/rules/development-workflow.mdc](../../.cursor/rules/development-workflow.mdc)
2. [.cursor/rules/monorepo-structure.mdc](../../.cursor/rules/monorepo-structure.mdc)
3. [.cursor/rules/subagent-delegation.mdc](../../.cursor/rules/subagent-delegation.mdc)
4. [.cursor/rules/_CRUX-RULE.mdc](../../.cursor/rules/_CRUX-RULE.mdc)

---

## Fact: Documentation Must Stay In Sync With Code Changes
### Modified: 2026-01-29
### Priority: H

Core tenets require documentation updates whenever code changes affect user-facing behavior:

```
∀Δ→Δ[README.md,website];-stale
```

This means: For all code changes (Δ), apply updates to both README.md and website documentation; remove stale content.

**Documentation update checklist after code changes:**
- [ ] README.md (if user-facing changes)
- [ ] Website docs (if feature/behavior changes)
- [ ] AGENTS.md (if structure/commands change)
- [ ] Package README (if package API changes)
- [ ] Remove obsolete content (don't just add new)

The `xfi-docs-expert` subagent should be invoked after significant code changes to verify documentation is updated.

### References
1. [.cursor/rules/core-tenets.mdc](../../.cursor/rules/core-tenets.mdc)
2. [.cursor/rules/core-tenets.crux.mdc](../../.cursor/rules/core-tenets.crux.mdc)
3. [.cursor/agents/xfi-docs-expert.md](../../.cursor/agents/xfi-docs-expert.md)
