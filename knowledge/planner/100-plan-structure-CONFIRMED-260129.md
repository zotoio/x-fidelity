# Topic: Plan Structure and Conventions

## Fact: Plan Directory Naming Convention
### Modified: 2026-01-29
### Priority: H

Engineering plans are stored in `knowledge/plans/` using a date-prefixed directory structure:

```
knowledge/plans/[YYYYMMDD]-[feature-name]/
```

**Components**:
- `YYYYMMDD` - The date the plan was created (e.g., `20260118`)
- `feature-name` - Kebab-case feature identifier (e.g., `rule-builder-gui`, `agent-knowledge-population`)

**Examples**:
```
knowledge/plans/20260118-rule-builder-gui/
knowledge/plans/20260129-agent-knowledge-population/
```

This naming convention ensures:
1. Plans are sorted chronologically
2. Feature names are easily identifiable
3. Unique directory names even for same-named features on different dates

### References
1. [xfi-planner agent definition](../../.cursor/agents/xfi-planner.md)
2. [xfi-create-plan skill](../../.cursor/skills/xfi-create-plan/SKILL.md)

---

## Fact: Index File Structure and Purpose
### Modified: 2026-01-29
### Priority: H

Each plan directory contains an index file as the primary coordination document:

**Filename**: `index-[feature-name]-[yyyymmdd].md`

**Required Sections**:
1. **Status** - Draft | Ready for Review | In Progress | Completed
2. **Overview** - High-level description of the initiative
3. **Key Decisions** - Architectural/design decisions with rationale
4. **Requirements** - Numbered list of requirements
5. **Subtask Dependency Graph** - Mermaid diagram showing task relationships
6. **Execution Order** - Phase-organized table of subtasks with subagent assignments
7. **Global Definition of Done** - Checklist for overall plan completion
8. **Execution Notes** - Filled during/after execution
9. **Completion Checklist** - Status of each subtask

**Example Status Values**:
- `Draft` - Plan being created
- `Ready for Review` - Plan complete, awaiting user approval
- `In Progress` - Subtasks being executed
- `Completed` - All work finished and verified

### References
1. [xfi-planner agent definition](../../.cursor/agents/xfi-planner.md)
2. [Rule Builder GUI index example](../plans/20260118-rule-builder-gui/index-rule-builder-gui-20260118.md)

---

## Fact: Subtask File Structure
### Modified: 2026-01-29
### Priority: H

Each subtask has a dedicated file following this naming convention:

**Filename**: `subtask-[NN]-[feature]-[subtask-name]-[yyyymmdd].md`

Where:
- `NN` - Two-digit subtask number (01, 02, etc.)
- `feature` - Abbreviated feature name
- `subtask-name` - Descriptive subtask identifier
- `yyyymmdd` - Creation date

**Required Sections**:

```markdown
## Metadata
- **Subtask ID**: [NN]
- **Feature**: [Feature Name]
- **Assigned Subagent**: [xfi-engineer|xfi-plugin-expert|etc.]
- **Dependencies**: [None | List of subtask IDs]
- **Created**: [YYYYMMDD]

## Objective
[Clear description of what this subtask accomplishes]

## Deliverables Checklist
- [ ] Deliverable 1
- [ ] Deliverable 2

## Definition of Done
- [ ] Code implemented
- [ ] Unit tests added
- [ ] No lint errors

## Implementation Notes
[Guidance for the executing agent]

## Execution Notes
[Filled by executing agent]
### Agent Session Info
### Work Log
### Blockers Encountered
### Files Modified
```

### References
1. [xfi-planner agent definition](../../.cursor/agents/xfi-planner.md)
2. [Example subtask file](../plans/20260118-rule-builder-gui/subtask-01-rule-builder-gui-scaffold-20260118.md)

---

## Fact: Plan Status Lifecycle
### Modified: 2026-01-29
### Priority: M

Plans progress through a defined status lifecycle:

```
Draft → Ready for Review → In Progress → Completed
```

**Status Transitions**:

| From | To | Trigger |
|------|-----|---------|
| Draft | Ready for Review | User confirms plan decisions |
| Ready for Review | In Progress | User approves execution start |
| In Progress | Completed | All subtasks done, reviews passed, docs updated |

**Additional Rules**:
1. Plans cannot skip statuses (no Draft → Completed)
2. Only the planner agent should update plan status
3. Status changes should be noted in Execution Notes
4. A plan may return to Draft if major changes are needed

**Completion Criteria** (for Completed status):
- All subtask execution notes filled
- All Global Definition of Done items checked
- Final code review passed
- Architecture review passed
- Global test suite passing
- Documentation updated
- User approval received

### References
1. [xfi-execute-plan skill](../../.cursor/skills/xfi-execute-plan/SKILL.md)
2. [xfi-create-plan skill](../../.cursor/skills/xfi-create-plan/SKILL.md)

---
