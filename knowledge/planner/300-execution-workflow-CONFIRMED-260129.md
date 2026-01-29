# Topic: Execution Workflow Patterns

## Fact: Plan Execution Phases
### Modified: 2026-01-29
### Priority: H

Plan execution follows a structured 10-phase workflow defined in the xfi-execute-plan skill:

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

**Phase Responsibilities**:
- **Phases 1-2**: Preparation and user confirmation
- **Phases 3-5**: Active subtask execution with progress tracking
- **Phase 6**: Completion verification loop
- **Phase 7**: Parallel quality reviews (code, architecture, tests)
- **Phase 8**: User approval gate
- **Phases 9-10**: Documentation and finalization

### References
1. [xfi-execute-plan skill](../../.cursor/skills/xfi-execute-plan/SKILL.md)

---

## Fact: User Confirmation Checkpoints
### Modified: 2026-01-29
### Priority: H

The execution workflow includes mandatory user confirmation checkpoints (USER STOP) to ensure alignment and approval before proceeding.

**Checkpoint 1: Pre-Execution Confirmation** (Phase 2)

Present to user before any subtask execution:

```markdown
## Plan Execution Summary

### Plan: [Feature Name]
**Directory**: `knowledge/plans/[yyyymmdd]-[feature-name]/`
**Status**: Ready for Execution

### Execution Phases
[Table showing phases, subtasks, subagents, deliverables]

### Total Work
- Subtasks: [N]
- Subagent invocations: [N]
- Parallel phases: [N]

### Risk Factors
- [Any identified risks]

---
Proceed with execution? (yes/no)
```

**Checkpoint 2: Post-Execution Review** (Phase 8)

Present to user after all subtasks and reviews complete:

```markdown
## Plan Execution Complete - Awaiting Review

### Summary of Changes
[Files modified, key accomplishments]

### Review Status
- Code Review: PASSED
- Architecture Review: PASSED
- Test Suite: ALL PASSING

### Pending Actions (after your approval)
1. Documentation update by xfi-docs-expert
2. Knowledge capture by xfi-system-design
```

**Rules**:
- NEVER proceed past a checkpoint without user confirmation
- ALWAYS wait for explicit "yes" or approval
- Document any user-requested changes

### References
1. [xfi-execute-plan skill - Step 2 and Step 7](../../.cursor/skills/xfi-execute-plan/SKILL.md)
2. [xfi-create-plan skill - Step 3 and Step 7](../../.cursor/skills/xfi-create-plan/SKILL.md)

---

## Fact: Review Gates and Quality Verification
### Modified: 2026-01-29
### Priority: H

Before user approval, the plan passes through three parallel review gates to ensure quality:

**1. Code Review Gate** (xfi-code-reviewer):
- Aggregate all modified files from subtask execution notes
- Review for: code quality, error handling, type safety, security, test coverage
- Produces: Review report with issues found

**2. Architecture Review Gate** (xfi-system-design):
- Review implemented changes for architectural consistency
- Check: alignment with design, package boundaries, pattern consistency
- Produces: Architecture review report

**3. Test Verification Gate** (xfi-testing-expert):
- Verify all new code has tests
- Run global test suite: `yarn test`
- Fix any failing tests
- Report coverage status

**Review Invocation Pattern**:
```
# All three invoked in parallel:
xfi-code-reviewer: "Perform comprehensive code review..."
xfi-system-design: "Review implemented changes for architectural consistency..."
xfi-testing-expert: "Verify test coverage and run global test suite..."
```

**Issue Resolution Loop**:
1. If reviewers find issues → invoke appropriate subagent to fix
2. Re-run affected reviews
3. Loop until all reviews pass
4. Update index completion checklist with review status

### References
1. [xfi-execute-plan skill - Step 6: Final Review Phase](../../.cursor/skills/xfi-execute-plan/SKILL.md)

---

## Fact: Plan Completion and Knowledge Capture
### Modified: 2026-01-29
### Priority: M

After user approval, the plan completion phase captures knowledge and updates documentation for future reference.

**Documentation Phase** (parallel invocations):

1. **xfi-docs-expert**:
   - Update README.md if needed
   - Update website docs for user-facing changes
   - Update affected package documentation
   - Update CHANGELOG if applicable

2. **xfi-system-design**:
   - Update architecture documentation if patterns changed
   - Add learnings to knowledge/ directory
   - Note patterns for future reference

**Index File Completion Update**:

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
- [Lesson 1]: [Description]
- [Lesson 2]: [Description]
```

**Final User Notification**:
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
```

### References
1. [xfi-execute-plan skill - Steps 8-9](../../.cursor/skills/xfi-execute-plan/SKILL.md)
2. [Rule Builder GUI completion summary](../plans/20260118-rule-builder-gui/index-rule-builder-gui-20260118.md)

---
