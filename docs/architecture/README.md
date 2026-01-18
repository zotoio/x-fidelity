# X-Fidelity Architecture Documentation

This directory contains architecture documentation, design decisions, and technical specifications for the X-Fidelity platform.

## Directory Structure

```
docs/architecture/
├── README.md           # This file
├── adr/                # Architecture Decision Records
│   └── ADR-001-*.md    # Individual ADRs
├── designs/            # Feature design documents
│   └── feature-*.md    # Design specs for features
└── diagrams/           # Architecture diagrams (Mermaid source)
    └── *.md            # Diagram markdown files
```

## Document Types

### Architecture Decision Records (ADR)

ADRs document significant architectural decisions and their rationale. Use the template:

```markdown
# ADR-XXX: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
[Background and problem statement]

## Decision
[The architectural decision made]

## Consequences
### Positive
- [Benefits]

### Negative
- [Tradeoffs]

## Affected Packages
- [List of packages impacted]

## Implementation Notes
[Technical details for implementation]
```

### Feature Design Documents

Design documents describe new features or significant enhancements before implementation:

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

### API Changes
[New/modified APIs]

### Data Flow
[How data flows through the system]

## Alternatives Considered
[Other approaches and why they were rejected]

## Testing Strategy
[How this will be tested]

## Documentation Requirements
[What docs need updating]

## Rollout Plan
[Implementation phases]
```

## Workflow

1. **Design First**: Create design documents before implementation
2. **Review**: Have designs reviewed by the `xfi-code-reviewer` agent
3. **Implement**: Use the `xfi-system-design` agent to produce executable designs
4. **Update**: Keep documents in sync with implementation

## Related Documentation

- `AGENTS.md` - High-level architecture for AI agents
- `website/docs/intro.md` - System architecture diagram
- `website/docs/key-concepts.md` - Core concepts
- `packages/*/README.md` - Package-specific documentation

## Contributing

When adding architecture documentation:

1. Follow the templates above
2. Include Mermaid diagrams where helpful
3. Reference affected packages explicitly
4. Update `AGENTS.md` if system structure changes
5. Have changes reviewed before merging
