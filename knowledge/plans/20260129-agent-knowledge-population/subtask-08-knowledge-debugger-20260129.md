# Subtask: Debugger Knowledge Population

## Metadata
- **Subtask ID**: 08
- **Feature**: Agent Knowledge Population
- **Assigned Subagent**: xfi-debugger
- **Dependencies**: 01 (Shared Knowledge)
- **Created**: 20260129

## Objective
Populate `knowledge/debugger/` with debugging patterns knowledge. Create 2-3 DRAFT topic files covering StandardError patterns, logging conventions, and error codes.

## Suggested Topics

### Topic 1: StandardError Patterns
**File**: `100-standard-error-patterns-DRAFT-260129.md`
- StandardError class structure
- Error code ranges (1000-1699)
- Error handler patterns
- Error serialization

### Topic 2: Logging Conventions
**File**: `200-logging-conventions-DRAFT-260129.md`
- Logger provider patterns
- ExecutionContext for traceability
- Log levels and usage
- Sensitive data masking in logs

### Topic 3: Troubleshooting Patterns (Optional)
**File**: `300-troubleshooting-patterns-DRAFT-260129.md`
- Common error scenarios
- Debug output interpretation
- Analysis failure diagnosis
- VSCode extension debugging

## Deliverables Checklist
- [x] Create `knowledge/debugger/100-standard-error-patterns-DRAFT-260129.md`
- [x] Create `knowledge/debugger/200-logging-conventions-DRAFT-260129.md`
- [x] Optionally create `knowledge/debugger/300-troubleshooting-patterns-DRAFT-260129.md`
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
- [x] 2-3 knowledge files created in `knowledge/debugger/`
- [x] Files follow naming convention: `[ORDERING]-[topic]-DRAFT-260129.md`
- [x] Each file contains 2-4 well-documented facts
- [x] All facts have Modified date, Priority, and References

## Implementation Notes

### Key Files to Reference
- `packages/x-fidelity-types/src/errorHandling.ts` - StandardError definition
- `packages/x-fidelity-core/src/utils/standardErrorHandler.ts` - Error handling
- `packages/x-fidelity-core/src/utils/logger.ts` - Logger interface
- `packages/x-fidelity-core/src/utils/loggerProvider.ts` - Logger provider
- `packages/x-fidelity-core/src/utils/executionContext.ts` - Execution context
- `packages/x-fidelity-core/src/utils/enhancedLogger.ts` - Enhanced logging
- `packages/x-fidelity-vscode/src/utils/diagnosticDebugger.ts` - VSCode debugging

### Exploration Commands
```bash
# View error handling types
cat packages/x-fidelity-types/src/errorHandling.ts

# Find error handler usage
rg "StandardError" packages/

# View logging patterns
cat packages/x-fidelity-core/src/utils/loggerProvider.ts
```

## Execution Notes

### Agent Session Info
- Agent: xfi-debugger
- Started: 2026-01-29T14:30:00Z
- Completed: 2026-01-29T14:45:00Z

### Work Log
1. Read subtask requirements and identified key source files
2. Analyzed error handling system in `packages/x-fidelity-types/src/errorHandling.ts`
3. Analyzed StandardErrorHandler in `packages/x-fidelity-core/src/utils/standardErrorHandler.ts`
4. Analyzed logging system: `logger.ts`, `loggerProvider.ts`, `executionContext.ts`, `enhancedLogger.ts`
5. Reviewed ILogger interface in `packages/x-fidelity-types/src/logger.ts`
6. Created 3 knowledge files covering StandardError patterns, logging conventions, and troubleshooting
7. Updated debugger README.md with new file entries

### Key Findings
- Error codes organized in ranges 1000-1699 mapping to 7 categories
- StandardErrorFactory provides consistent error creation with auto-category detection
- LoggerProvider manages mode-aware logger instances (CLI, VSCode, Server, Hook)
- ExecutionContext provides correlation IDs for tracing across log entries
- PrefixingLogger automatically enhances logs with correlation metadata
- EnhancedLogger adds performance tracking and structured logging

### Blockers Encountered
None - all source files were accessible and well-documented

### Files Created
1. `knowledge/debugger/100-standard-error-patterns-DRAFT-260129.md` - 4 facts
2. `knowledge/debugger/200-logging-conventions-DRAFT-260129.md` - 5 facts
3. `knowledge/debugger/300-troubleshooting-patterns-DRAFT-260129.md` - 5 facts

### Files Modified
1. `knowledge/debugger/README.md` - Updated contents table
