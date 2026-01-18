---
sidebar_position: 1
---

# Building with Cursor

X-Fidelity includes specialized AI tooling for [Cursor IDE](https://cursor.sh) that significantly accelerates development. When working on the codebase in Cursor, you have access to slash commands, specialized subagents, and step-by-step skills.

## Slash Commands

Use these commands in Cursor chat by typing `/xfi-*` for guided development workflows:

### Development Workflow Commands

| Command | Description |
|---------|-------------|
| `/xfi-review` | Comprehensive code review using three expert subagents in parallel (code reviewer, security expert, testing expert) |
| `/xfi-test` | Run the test suite and automatically diagnose any failures |
| `/xfi-build` | Build the monorepo and diagnose build issues |

### Creation Commands

| Command | Description |
|---------|-------------|
| `/xfi-create-plugin` | Create a new analysis plugin with facts, operators, tests, and sample rules |
| `/xfi-create-rule` | Create a new analysis rule with proper structure and archetype integration |
| `/xfi-create-archetype` | Create a new archetype configuration for a project type |

### Debug and Fix Commands

| Command | Description |
|---------|-------------|
| `/xfi-debug` | Debug errors, exceptions, and unexpected behavior |
| `/xfi-fix` | Smart routing to the appropriate expert subagent based on problem type |
| `/xfi-analyze` | Troubleshoot X-Fidelity analysis issues (rules, plugins, output) |

### Release and Documentation Commands

| Command | Description |
|---------|-------------|
| `/xfi-release` | Prepare for release following the unified release workflow |
| `/xfi-docs` | Update documentation to stay in sync with code changes |

### Quality Assurance Commands

| Command | Description |
|---------|-------------|
| `/xfi-consistency` | Verify CLI and VSCode extension produce identical results |
| `/xfi-security` | Perform security review of code changes |

## Specialized Subagents

The AI has access to domain-specific expert subagents that provide deep expertise in different aspects of X-Fidelity:

| Subagent | Expertise | Auto-triggers |
|----------|-----------|---------------|
| `xfi-build-expert` | Turbo, yarn workspaces, esbuild, TypeScript compilation | Build failures, CI issues |
| `xfi-testing-expert` | Jest, coverage, integration tests, VSCode extension testing | Test failures, coverage gaps |
| `xfi-plugin-expert` | Plugin architecture, facts, operators, AST analysis with tree-sitter | Plugin development |
| `xfi-vscode-expert` | VSCode extension, webviews, tree views, diagnostics, packaging | Extension issues |
| `xfi-rules-expert` | json-rules-engine, archetypes, conditions, events, exemptions | Rule creation |
| `xfi-security-expert` | Path validation, directory traversal prevention, webhooks, secrets | Security reviews |
| `xfi-debugger` | Error analysis, log interpretation, StandardError patterns | Runtime errors |
| `xfi-docs-expert` | README, website docs (Docusaurus), CHANGELOG | Documentation updates |
| `xfi-code-reviewer` | Balanced code review, quality and security assessment | Before commits, PR reviews |

### Parallel Subagent Execution

Subagents can run in parallel when their domains are independent. For example, after implementing a feature:

```
Run in parallel:
├── xfi-code-reviewer (review the changes)
├── xfi-testing-expert (check test coverage)
└── xfi-docs-expert (check documentation needs)
```

## Skills

Skills are step-by-step guides that are automatically loaded when relevant. They provide detailed workflows for common development tasks:

| Skill | Purpose |
|-------|---------|
| `xfi-create-plugin` | Complete plugin creation workflow with templates |
| `xfi-create-rule` | Rule creation with fact/operator selection guidance |
| `xfi-create-archetype` | Archetype configuration with rule and exemption setup |
| `xfi-release-workflow` | Release process, conventional commits, version management |
| `xfi-debug-analysis` | Troubleshooting analysis issues systematically |
| `xfi-consistency-testing` | CLI-Extension parity verification workflow |
| `xfi-documentation-update` | Documentation sync between README and website |
| `xfi-add-package` | Adding new packages to the monorepo |

## File Locations

| Resource | Location |
|----------|----------|
| Slash Commands | `.cursor/commands/` |
| Subagents | `.cursor/agents/` |
| Skills | `.cursor/skills/` |
| Workspace Rules | `.cursor/rules/` |

## Example Workflows

### Creating a New Plugin

1. Use `/xfi-create-plugin` command
2. The AI reads the `xfi-create-plugin` skill for step-by-step guidance
3. The `xfi-plugin-expert` subagent provides architecture expertise
4. Complete plugin with facts, operators, tests, and sample rules is created

### Debugging a Test Failure

1. Use `/xfi-test` command
2. Tests run via `yarn test`
3. If failures occur, `xfi-testing-expert` analyzes the issue
4. If it's a runtime error, `xfi-debugger` is also engaged
5. Fix is applied and verified

### Preparing a Release

1. Use `/xfi-release` command
2. `xfi-testing-expert` and `xfi-docs-expert` run pre-checks in parallel
3. The `xfi-release-workflow` skill guides through conventional commits
4. Dry run is executed to preview the release

## Tips for Effective Use

1. **Let the AI auto-delegate**: Subagents are triggered automatically based on context
2. **Use slash commands for complex tasks**: They provide structured workflows
3. **Trust subagent expertise**: Each subagent is a subject matter expert
4. **Combine insights**: Multi-subagent commands synthesize findings from all experts
5. **Check the skills**: Skills contain detailed checklists and templates
