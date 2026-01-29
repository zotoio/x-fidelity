# Subtask: Rules Expert Knowledge Population

## Metadata
- **Subtask ID**: 06
- **Feature**: Agent Knowledge Population
- **Assigned Subagent**: xfi-rules-expert
- **Dependencies**: 01 (Shared Knowledge)
- **Created**: 20260129

## Objective
Populate `knowledge/rules-expert/` with rules engine knowledge. Create 2-3 DRAFT topic files covering rule JSON structure, archetype configuration, and exemption patterns.

## Suggested Topics

### Topic 1: Rule JSON Structure
**File**: `100-rule-json-structure-DRAFT-260129.md`
- Global rules (-global suffix) vs iterative rules (-iterative suffix)
- Rule conditions using facts and operators
- Event definitions (type: warning/fatality, params)
- Rule naming conventions

### Topic 2: Archetype Configuration
**File**: `200-archetype-configuration-DRAFT-260129.md`
- Archetype JSON structure
- Plugin specification and loading
- Rule assignment (global and iterative)
- Minimum dependency versions
- File patterns (include/exclude)

### Topic 3: Exemption Patterns (Optional)
**File**: `300-exemption-patterns-DRAFT-260129.md`
- Exemption file structure
- Team and project exemptions
- Rule-specific exemptions
- Exemption merging logic

## Deliverables Checklist
- [x] Create `knowledge/rules-expert/100-rule-json-structure-DRAFT-260129.md`
- [x] Create `knowledge/rules-expert/200-archetype-configuration-DRAFT-260129.md`
- [x] Optionally create `knowledge/rules-expert/300-exemption-patterns-DRAFT-260129.md`
- [x] Each file contains 2-4 facts following the schema
- [x] All facts include source file references

## Knowledge File Format Requirements

Each topic file must follow this structure:
```markdown
# Topic: [Topic Name in Title Case]

## Fact: [Descriptive Fact Title]
### Modified: 2026-01-29
### Priority: H|M|L

[Fact content - detailed explanation with code examples if helpful]

### References
1. [Source file](../../packages/path/to/file.ts)

---
```

## Definition of Done
- [x] 2-3 knowledge files created in `knowledge/rules-expert/`
- [x] Files follow naming convention: `[ORDERING]-[topic]-DRAFT-260129.md`
- [x] Each file contains 2-4 well-documented facts
- [x] All facts have Modified date, Priority, and References

## Implementation Notes

### Key Files to Reference
- `packages/x-fidelity-democonfig/src/node-fullstack.json` - Example archetype
- `packages/x-fidelity-democonfig/src/rules/` - Example rules
- `packages/x-fidelity-democonfig/src/node-fullstack-exemptions.json` - Exemptions
- `packages/x-fidelity-core/src/core/engine/engineSetup.ts` - Rule loading
- `packages/x-fidelity-core/src/utils/exemptionUtils.ts` - Exemption handling
- `website/docs/rules.md` - Rules documentation

### Exploration Commands
```bash
# List all demo rules
ls packages/x-fidelity-democonfig/src/rules/

# View an archetype
cat packages/x-fidelity-democonfig/src/node-fullstack.json

# View exemptions structure
cat packages/x-fidelity-democonfig/src/node-fullstack-exemptions.json
```

## Execution Notes

### Agent Session Info
- Agent: xfi-rules-expert
- Started: 2026-01-29
- Completed: 2026-01-29

### Work Log
1. Read subtask file and key source files to understand requirements
2. Analyzed archetype configuration in `node-fullstack.json`
3. Examined multiple rule files (global and iterative) to document patterns
4. Reviewed exemption structure and loading logic in `exemptionUtils.ts`
5. Studied engine setup to understand fact/operator registration and event handling
6. Created 3 DRAFT knowledge files with 4 facts each (12 facts total)
7. Updated README.md with new file listings

### Key Findings
- Rules distinguished by `-global` vs `-iterative` suffix with REPO_GLOBAL_CHECK sentinel
- Conditions use json-rules-engine with custom operators from plugins
- Exemptions support both legacy single-file and team/project directory patterns
- URL normalization ensures SSH format matching for exemptions

### Blockers Encountered
None

### Files Created
1. `knowledge/rules-expert/100-rule-json-structure-DRAFT-260129.md` (4 facts)
2. `knowledge/rules-expert/200-archetype-configuration-DRAFT-260129.md` (4 facts)
3. `knowledge/rules-expert/300-exemption-patterns-DRAFT-260129.md` (4 facts)

### Files Modified
1. `knowledge/rules-expert/README.md` - Updated contents table
