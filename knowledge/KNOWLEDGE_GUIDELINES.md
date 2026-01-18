# Knowledge Management Guidelines

This document defines the rules and best practices for managing knowledge in the X-Fidelity knowledge base.

## Core Principles

1. **Truth Over Assumption**: Only CONFIRMED knowledge is treated as fact
2. **Traceability**: All facts have modification dates and references
3. **Currency**: Most recently modified files appear first
4. **Ownership**: Each agent owns their domain's knowledge
5. **Append-Only Facts**: Never reorder facts within a topic file

## File Naming Convention

### Format
```
[ORDERING]-[topic]-[STATUS]-[YYMMDD].md
```

### Components

| Component | Format | Example | Description |
|-----------|--------|---------|-------------|
| ORDERING | 3 digits | `100` | Sort order, lower = more recent |
| topic | kebab-case | `turbo-caching` | Topic name |
| STATUS | enum | `CONFIRMED` | CONFIRMED or DRAFT |
| YYMMDD | 6 digits | `260118` | Last modified date |

### Complete Examples
```
100-path-validation-CONFIRMED-260118.md
150-webhook-security-DRAFT-260117.md
200-secret-handling-CONFIRMED-260115.md
```

## Ordering Strategy

### Initial Creation
Start with increments of 100:
```
100-first-topic-DRAFT-260118.md
200-second-topic-DRAFT-260117.md
300-third-topic-CONFIRMED-260115.md
```

### Inserting Between Files
Use the midpoint to minimize renames:

| Insert Between | New Order |
|----------------|-----------|
| 100 and 200 | 150 |
| 100 and 150 | 125 |
| 150 and 200 | 175 |

### Reordering on Modification
When a file is modified:
1. Update the YYMMDD to current date
2. If it should move to top (most recent), update ORDERING
3. Only rename files that need to change position

### Example Reordering
Before modification:
```
100-topic-a-CONFIRMED-260115.md
200-topic-b-CONFIRMED-260110.md
300-topic-c-CONFIRMED-260105.md
```

After modifying topic-c on 260118:
```
100-topic-c-CONFIRMED-260118.md  ← Moved to top, took 100
150-topic-a-CONFIRMED-260115.md  ← Shifted, took midpoint 150
200-topic-b-CONFIRMED-260110.md  ← Unchanged
```

## Fact Schema

Every fact within a topic file follows this structure:

```markdown
## Fact: [Descriptive Title]
### Modified: [YYYY-MM-DD]
### Priority: [H/M/L]

[Detailed fact content. Can be multiple paragraphs.
Include code examples if relevant.]

### References
1. [Source file or doc](./relative/path.md)
2. [External reference](https://example.com)
3. [Related knowledge](../other-agent/topic.md)

---
```

### Priority Levels

| Level | Meaning | When to Use |
|-------|---------|-------------|
| H | High | Critical knowledge, core patterns, always relevant |
| M | Medium | Important info, frequently referenced |
| L | Low | Supporting details, edge cases, occasional reference |

### Fact Rules

1. **Append-only**: New facts go at the end of the file
2. **Never reorder**: Maintain original fact order for stability
3. **Update in place**: Modify existing facts when information changes
4. **Always date**: Update Modified date when fact changes
5. **Always reference**: Link to evidence or source

## Topic File Template

```markdown
# Topic: [Topic Name in Title Case]

## Fact: [First Fact Title]
### Modified: YYYY-MM-DD
### Priority: H

[Fact content here]

### References
1. [Primary source](./path)

---

## Fact: [Second Fact Title]
### Modified: YYYY-MM-DD
### Priority: M

[Fact content here]

### References
1. [Source](./path)

---
```

## Knowledge Lifecycle

### Creating New Knowledge

1. Create file: `100-topic-DRAFT-YYMMDD.md`
2. Shift existing files if needed (100→150, etc.)
3. Add facts using the schema
4. Set appropriate priority for each fact

### Updating Existing Knowledge

1. Edit the fact content
2. Update the fact's Modified date
3. Update the filename YYMMDD
4. Reorder files if this becomes most recent

### Promoting Draft to Confirmed

1. Change STATUS in filename: `DRAFT` → `CONFIRMED`
2. Verify all facts have been validated
3. Update YYMMDD to promotion date

### Deprecating Knowledge

1. Move file to `archive/` subdirectory
2. Keep original filename for history
3. Add `[DEPRECATED]` note at top of file

## Agent Workflows

### Before Making Decisions
```
1. List files in knowledge/{your-subdirectory}/
2. Files are sorted by ORDERING (lower = more recent)
3. Read CONFIRMED files as source of truth
4. Note DRAFT files but don't rely on them
```

### When Learning Something New
```
1. Check if topic file exists
2. If exists: Append new fact to end of file
3. If new topic: Create 100-topic-DRAFT-YYMMDD.md
4. Update file YYMMDD and reorder if needed
5. Ask user to confirm before treating as fact
```

### When Knowledge is Validated
```
1. Change filename STATUS: DRAFT → CONFIRMED
2. Update YYMMDD to current date
3. Reorder to top of directory if most recent
4. Update README.md index if maintained
```

## Directory README Files

Each agent's knowledge directory should maintain a README.md that:
- Lists current topics
- Provides quick reference to key knowledge
- Is NOT a knowledge topic file (no ordering prefix)

## Cross-Agent Knowledge

### Shared Knowledge (`knowledge/shared/`)
- Platform-wide patterns and conventions
- Used by multiple agents
- Requires broader review for changes

### Referencing Other Agents' Knowledge
```markdown
### References
1. [Plugin patterns](../plugin-expert/100-plugin-structure-CONFIRMED-260118.md)
```

### Conflicting Knowledge
1. Identify the conflict
2. Consult user for resolution
3. Update both files for consistency
4. Consider moving to shared/ if cross-cutting

## Best Practices

### Do
- Keep facts atomic and focused
- Include code examples where helpful
- Link to source files as references
- Update modification dates accurately
- Use descriptive fact titles

### Don't
- Treat DRAFT knowledge as fact
- Reorder facts within a topic file
- Delete facts (deprecate instead)
- Duplicate knowledge across agents
- Skip the fact schema structure
