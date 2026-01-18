# X-Fidelity Knowledge Base

This directory contains the approved source of truth memories for all X-Fidelity AI agents. Each agent maintains their domain-specific knowledge here, organized in subdirectories.

## Directory Structure

```
knowledge/
├── README.md                    # This file
├── KNOWLEDGE_GUIDELINES.md      # Knowledge management rules
├── shared/                      # Cross-cutting knowledge used by all agents
├── plans/                       # Engineering plan files (see plans/README.md)
├── build-expert/                # xfi-build-expert knowledge
├── code-reviewer/               # xfi-code-reviewer knowledge
├── debugger/                    # xfi-debugger knowledge
├── docs-expert/                 # xfi-docs-expert knowledge
├── engineer/                    # xfi-engineer knowledge
├── planner/                     # xfi-planner knowledge
├── plugin-expert/               # xfi-plugin-expert knowledge
├── rules-expert/                # xfi-rules-expert knowledge
├── security-expert/             # xfi-security-expert knowledge
├── system-design/               # xfi-system-design knowledge
├── testing-expert/              # xfi-testing-expert knowledge
└── vscode-expert/               # xfi-vscode-expert knowledge
```

## File Naming Convention

All knowledge topic files follow this format:

```
[ORDERING]-[topic]-[STATUS]-[YYMMDD].md
```

### Components

| Component | Format | Description |
|-----------|--------|-------------|
| ORDERING | 3 digits | Sort order (100, 200, 300...) - most recent at top |
| topic | kebab-case | Topic name |
| STATUS | CONFIRMED/DRAFT | Knowledge status |
| YYMMDD | 6 digits | Last modified date |

### Examples

```
100-turbo-caching-CONFIRMED-260118.md      # Most recently modified, confirmed
200-esbuild-config-CONFIRMED-260115.md     # Second most recent
300-ci-workflow-DRAFT-260110.md            # Older draft
```

### Ordering Strategy

- Start new files with increments of 100 (100, 200, 300...)
- To insert between existing files, use the midpoint:
  - Insert between 100 and 200 → use 150
  - Insert between 150 and 200 → use 175
- This minimizes filename changes when reordering
- Lower numbers appear first (most recently modified at top)

### When to Update Filenames

Update the filename when:
1. **Content is modified** → Update YYMMDD, potentially reorder to move to top
2. **Status changes** → Change CONFIRMED ↔ DRAFT
3. **Reordering needed** → Update ORDERING prefix

## Knowledge Topic File Structure

Each topic file contains facts in a consistent schema:

```markdown
# Topic: [Topic Name]

## Fact: [Fact Title]
### Modified: [YYYY-MM-DD]
### Priority: [H/M/L]

[Fact content - detailed explanation]

### References
1. [Reference link or path](./path-or-url)
2. [Another reference](./path-or-url)

---

## Fact: [Another Fact Title]
### Modified: [YYYY-MM-DD]
### Priority: [H/M/L]

[Fact content]

### References
1. [Reference](./path)

---
```

### Fact Schema Rules

1. **Append-only**: New facts are added at the end, never reorder existing facts
2. **Priority levels**:
   - `H` (High) - Critical knowledge, always relevant
   - `M` (Medium) - Important, frequently referenced
   - `L` (Low) - Supporting details, occasional reference
3. **References**: Link to source files, documentation, or evidence
4. **Separator**: Use `---` between facts

## Status Definitions

### CONFIRMED
- Verified through implementation, testing, or user approval
- Can be used as source of truth for decisions
- Facts within may still have individual priority

### DRAFT
- Proposed knowledge pending verification
- Should NOT be treated as fact
- Requires user confirmation to promote

## Agent Responsibilities

Each agent is responsible for:

1. **Reading Knowledge**: Check subdirectory before making decisions
2. **Writing Knowledge**: Document new learnings with proper schema
3. **Maintaining Order**: Keep most recently modified files at top
4. **Respecting Status**: Only CONFIRMED knowledge is fact
5. **Appending Facts**: Add new facts to end of topic files

## Cross-Agent Knowledge

- **shared/** contains knowledge applicable to all agents
- Reference shared knowledge rather than duplicating
- Updates to shared knowledge require broader consideration

## Quick Reference

| Task | Action |
|------|--------|
| New topic | Create `100-topic-DRAFT-YYMMDD.md`, shift others down |
| Update topic | Update YYMMDD in filename, reorder if needed |
| Confirm draft | Change DRAFT → CONFIRMED in filename |
| Add fact | Append to end of topic file with schema |
| Deprecate | Move to `archive/` subdirectory |
