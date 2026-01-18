---
name: xfi-execute-plan
description: Guide for executing engineering plans through coordinated subagent work. Use when executing existing plans from knowledge/plans/ directory.
---

# Executing X-Fidelity Engineering Plans

This skill guides the xfi-planner agent through executing comprehensive engineering plans by coordinating subagents.

## Prerequisites

- An existing plan in `knowledge/plans/[yyyymmdd]-[feature-name]/`
- Plan status should be "Ready for Review" or "In Progress"
- All subtask files should exist and be complete

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Load and analyze plan index and subtask files           │
├─────────────────────────────────────────────────────────────┤
│ 2. USER STOP: Confirm execution summary                    │
├─────────────────────────────────────────────────────────────┤
│ 3. Execute subtasks per dependency graph                   │
├─────────────────────────────────────────────────────────────┤
│ 4. Capture and review results from each subagent           │
├─────────────────────────────────────────────────────────────┤
│ 5. Update index with progress                              │
├─────────────────────────────────────────────────────────────┤
│ 6. Verify all subtasks and DoD complete                    │
├─────────────────────────────────────────────────────────────┤
│ 7. Final review (code, design, tests)                      │
├─────────────────────────────────────────────────────────────┤
│ 8. USER STOP: Review and approve changes                   │
├─────────────────────────────────────────────────────────────┤
│ 9. Documentation and knowledge capture                     │
├─────────────────────────────────────────────────────────────┤
│ 10. Mark plan completed                                    │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Load and Analyze Plan

### Read Plan Files

1. List available plans in `knowledge/plans/`
2. Read the selected plan's index file
3. Read all subtask files
4. Analyze the dependency graph

### Validation Checks

- [ ] Index file exists and is complete
- [ ] All referenced subtask files exist
- [ ] Dependency graph is valid (no cycles)
- [ ] Each subtask has assigned subagent
- [ ] Definition of done is clear for each subtask

## Step 2: User Confirmation (MANDATORY STOP)

**STOP and present execution summary:**

```markdown
## Plan Execution Summary

### Plan: [Feature Name]
**Directory**: `knowledge/plans/[yyyymmdd]-[feature-name]/`
**Status**: Ready for Execution

### Execution Phases

#### Phase 1 (Parallel)
| Subtask | File | Subagent | Deliverables |
|---------|------|----------|--------------|
| 01 | subtask-01-... | xfi-engineer | [Brief summary] |
| 02 | subtask-02-... | xfi-engineer | [Brief summary] |

#### Phase 2 (After Phase 1)
| Subtask | File | Subagent | Deliverables |
|---------|------|----------|--------------|
| 03 | subtask-03-... | xfi-engineer | [Brief summary] |

### Total Work
- Subtasks: [N]
- Subagent invocations: [N]
- Parallel phases: [N]
- Sequential phases: [N]

### Risk Factors
- [Any identified risks from plan]

---

Proceed with execution? (yes/no)
```

**Wait for user confirmation before proceeding.**

## Step 3: Execute Subtasks

### Parallel Execution

For subtasks that can run in parallel (no dependencies on each other):

```
Invoke multiple subagents simultaneously:

For each subtask in current phase:
  Invoke [assigned-subagent] with:
  
  "Execute the engineering task defined in this subtask file:
  
  **Subtask File**: knowledge/plans/[plan-dir]/[subtask-file].md
  
  **IMPORTANT INSTRUCTIONS**:
  1. Read the subtask file carefully
  2. Implement all deliverables listed
  3. Follow the testing strategy (NO global tests)
  4. Update the 'Execution Notes' section in the subtask file when done
  5. Report back with summary of work completed
  
  **Constraints**:
  - Only modify files related to this subtask
  - Do NOT run global test suites
  - Create targeted tests for your changes
  - Skip test execution if files may be modified by parallel agents
  
  When complete, update the subtask file's Execution Notes section with:
  - Agent session info
  - Work log
  - Any blockers encountered
  - List of files modified"
```

### Sequential Execution

For subtasks with dependencies:

1. Wait for all dependency subtasks to complete
2. Verify dependency subtasks' execution notes are filled
3. Then invoke the dependent subtask's subagent

### Tracking Progress

After each subagent completes:

1. **Read the updated subtask file** to verify completion
2. **Update the index file** completion checklist:
   ```markdown
   ## Completion Checklist
   - [x] Subtask 01: Completed - [brief summary]
   - [x] Subtask 02: Completed - [brief summary]
   - [ ] Subtask 03: In Progress
   ```
3. **Note any blockers** for resolution

## Step 4: Capture and Review Results

### After Each Subtask Completion

Read the subtask's execution notes:
- Files modified
- Tests created
- Any issues encountered
- Blockers that need resolution

### Handle Blockers

If a subtask reports blockers:
1. Analyze the blocker
2. Determine if it blocks other subtasks
3. Either resolve directly or invoke appropriate subagent
4. Update subtask file with resolution

### Update Index Execution Notes

```markdown
## Execution Notes

### Phase 1 Completed: [timestamp]
- Subtask 01: [summary of changes]
- Subtask 02: [summary of changes]

### Phase 2 Completed: [timestamp]
- Subtask 03: [summary of changes]

### Issues Encountered
- [Issue 1]: [How it was resolved]
```

## Step 5: Verify Completion

### Completion Loop

After all subtasks complete, verify:

1. **All subtask execution notes filled**
2. **All deliverables checked off**
3. **No outstanding blockers**

If any items incomplete:
```
Re-invoke the relevant subagent:

"The subtask at [path] has incomplete items:

Incomplete deliverables:
- [List unchecked items]

Please complete these items and update the execution notes."
```

Loop until all complete.

## Step 6: Final Review Phase

Invoke reviewers in parallel:

### xfi-code-reviewer

```
Invoke xfi-code-reviewer subagent with:

"Perform a comprehensive code review of all changes from plan execution:

Plan: knowledge/plans/[plan-dir]/

Files modified (from subtask execution notes):
[Aggregate list of all modified files]

Review for:
1. Code quality and patterns
2. Error handling
3. Type safety
4. Security concerns
5. Test coverage

Provide a review report with any issues found."
```

### xfi-system-design

```
Invoke xfi-system-design subagent with:

"Review the implemented changes for architectural consistency:

Plan: knowledge/plans/[plan-dir]/

Files modified (from subtask execution notes):
[Aggregate list of all modified files]

Review for:
1. Alignment with original design
2. Package boundary adherence
3. Pattern consistency
4. Any architectural concerns

Provide a review report."
```

### xfi-testing-expert

```
Invoke xfi-testing-expert subagent with:

"Verify test coverage and run the global test suite:

Plan: knowledge/plans/[plan-dir]/

Files modified (from subtask execution notes):
[Aggregate list of all modified files]

Tasks:
1. Verify all new code has tests
2. Run global test suite: yarn test
3. Fix any failing tests
4. Report coverage status

Continue until all tests pass."
```

### Handle Review Issues

If reviewers find issues:
1. Invoke appropriate subagent to fix
2. Re-run affected reviews
3. Loop until all reviews pass

### Update Index

```markdown
## Completion Checklist
- [x] Subtask 01: Completed
- [x] Subtask 02: Completed
- [x] Subtask 03: Completed
- [x] Final code review: Passed - [summary]
- [x] Final architecture review: Passed - [summary]
- [x] Global tests verified: All passing
```

## Step 7: User Review (MANDATORY STOP)

**STOP and present for user approval:**

```markdown
## Plan Execution Complete - Awaiting Review

### Plan: [Feature Name]

### Summary of Changes

#### Files Modified
[Aggregate list from all subtasks]

#### Key Accomplishments
1. [Major accomplishment 1]
2. [Major accomplishment 2]
3. [Major accomplishment 3]

### Review Status
- Code Review: PASSED
- Architecture Review: PASSED  
- Test Suite: ALL PASSING

### Issues Resolved During Execution
- [Issue 1]: [Resolution]

### Pending Actions (after your approval)
1. Documentation update by xfi-docs-expert
2. Knowledge capture by xfi-system-design

---

Please review the changes. When satisfied, confirm to proceed with documentation and finalization.
```

**Wait for user approval.**

## Step 8: Documentation and Knowledge Capture

After user approval, invoke in parallel:

### xfi-docs-expert

```
Invoke xfi-docs-expert subagent with:

"Update documentation for the completed plan:

Plan: knowledge/plans/[plan-dir]/

Changes implemented:
[Summary of all changes]

Tasks:
1. Update README.md if needed
2. Update website docs if user-facing changes
3. Update any affected package documentation
4. Update CHANGELOG if applicable

Report what was updated."
```

### xfi-system-design

```
Invoke xfi-system-design subagent with:

"Capture knowledge from the completed plan:

Plan: knowledge/plans/[plan-dir]/

Tasks:
1. Update architecture documentation if patterns changed
2. Add learnings to knowledge/ directory
3. Update any affected design documents
4. Note any patterns for future reference

Report what was captured."
```

## Step 9: Mark Plan Complete

Update the index file:

```markdown
## Status
Completed

## Completion Summary
- **Started**: [timestamp]
- **Completed**: [timestamp]
- **Subtasks Executed**: [N]
- **Files Modified**: [N]
- **Tests Added**: [N]

## Final Documentation
- README updates: [Yes/No - summary]
- Website updates: [Yes/No - summary]
- Knowledge captured: [Yes/No - summary]

## Lessons Learned
- [Lesson 1]
- [Lesson 2]
```

Notify user:

```markdown
## Plan Completed Successfully

### Plan: [Feature Name]
**Status**: COMPLETED

### Final Summary
- All [N] subtasks completed
- [N] files modified
- All tests passing
- Documentation updated
- Knowledge captured

The plan has been marked complete. All changes are in place.
```

## Critical Rules

1. **ALWAYS stop for user confirmation** at Steps 2 and 7
2. **FOLLOW dependency graph** - never execute dependent tasks before dependencies
3. **UPDATE index file** after each major milestone
4. **VERIFY completion** before proceeding to next phase
5. **HANDLE blockers** promptly - don't leave subtasks stuck
6. **RUN global tests** only in final review phase
7. **CAPTURE knowledge** for future reference

## Troubleshooting

### Subtask Agent Fails
1. Read the error details
2. Determine if it's a transient or permanent issue
3. Re-invoke with additional context if needed
4. Update subtask file with issue notes

### Tests Fail in Final Phase
1. Have xfi-testing-expert diagnose
2. Invoke xfi-engineer to fix issues
3. Re-run tests until passing
4. Update affected subtask execution notes

### Review Finds Major Issues
1. Assess severity of issues
2. Create ad-hoc subtasks for fixes
3. Re-invoke appropriate subagents
4. Loop through review again

### Dependency Deadlock
1. Re-analyze dependency graph
2. Identify circular dependencies
3. Break cycle by redefining subtasks
4. Update plan and re-execute affected subtasks

## Progress Tracking Template

Use this template in the index file:

```markdown
## Execution Progress

| Phase | Subtask | Status | Started | Completed | Notes |
|-------|---------|--------|---------|-----------|-------|
| 1 | 01 | Completed | [time] | [time] | [notes] |
| 1 | 02 | Completed | [time] | [time] | [notes] |
| 2 | 03 | In Progress | [time] | - | [notes] |
| 3 | 04 | Pending | - | - | - |
```
