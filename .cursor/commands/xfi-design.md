# xfi-design

Create architecture and design documentation for X-Fidelity features and enhancements.

## Instructions

Use the **xfi-system-design subagent** to create technical design documentation for new features, architecture decisions, or platform enhancements.

## Workflow

1. **Understand Requirements**:
   - Gather feature/enhancement requirements from the user
   - Clarify scope and constraints

2. **Use xfi-system-design subagent** to:
   - Analyze affected packages across the monorepo
   - Create architecture diagrams (Mermaid)
   - Draft design documents
   - Identify risks and dependencies

3. **Produce Documentation**:
   - Feature Design Documents → `docs/architecture/designs/`
   - Architecture Decision Records → `docs/architecture/adr/`
   - Update existing docs as needed

4. **Review and Iterate**:
   - Present design for user review
   - Refine based on feedback
   - **Only edit files after user confirmation**

## Design Document Types

### Feature Design Document

For new features or significant enhancements:

```markdown
# Feature: [Name]

## Overview
[Brief description]

## Motivation
[Why this feature is needed]

## Detailed Design
### Architecture
[System design with diagrams]

### Package Changes
| Package | Changes Required |
|---------|------------------|
| core    | [Changes]        |

## Testing Strategy
[How this will be tested]

## Documentation Requirements
[What docs need updating]
```

### Architecture Decision Record (ADR)

For significant architectural decisions:

```markdown
# ADR-XXX: [Title]

## Status
Proposed

## Context
[Background and problem statement]

## Decision
[The architectural decision made]

## Consequences
[Benefits and tradeoffs]

## Affected Packages
[List of packages impacted]
```

## Package Impact Analysis

When designing features, consider all affected packages:

| Package | Common Changes |
|---------|----------------|
| `x-fidelity-types` | New type definitions |
| `x-fidelity-core` | Core engine changes |
| `x-fidelity-plugins` | New facts/operators |
| `x-fidelity-cli` | CLI command changes |
| `x-fidelity-vscode` | Extension UI/commands |
| `x-fidelity-server` | Server API changes |

## Output Locations

| Document Type | Location |
|---------------|----------|
| Feature designs | `docs/architecture/designs/feature-*.md` |
| ADRs | `docs/architecture/adr/ADR-*.md` |
| Architecture diagrams | `docs/architecture/diagrams/` |
| Public docs | `website/docs/` |

## Key Principles

1. **Design First**: Create design docs before implementation
2. **Cross-Package Awareness**: Consider ripple effects
3. **Documentation as Code**: Keep docs in sync with implementation
4. **Read-Only by Default**: Only edit files after user confirms
5. **Executable Designs**: Docs should be clear enough for implementation

## Example Usage

### New Feature Design
```
/xfi-design

Design a new plugin for detecting deprecated API usage.
Consider: AST analysis, rule integration, VSCode display.
```

### Architecture Decision
```
/xfi-design

We need to decide how to handle caching for remote configurations.
Options: in-memory, file-based, or hybrid approach.
```

### Enhancement Proposal
```
/xfi-design

Suggest enhancements to improve analysis performance.
Focus on: parallel processing, caching, incremental analysis.
```

## Related Commands

- `/xfi-docs` - Update documentation after implementation
- `/xfi-review` - Review code changes
- `/xfi-create-plugin` - Create a new plugin (after design)
- `/xfi-create-rule` - Create a new rule (after design)
