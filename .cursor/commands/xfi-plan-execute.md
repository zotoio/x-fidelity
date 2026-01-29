# xfi-plan-execute

Execute an existing engineering plan from the knowledge/plans directory.

## Instructions

Use the **xfi-planner subagent** with the **xfi-execute-plan skill** to execute comprehensive engineering plans by coordinating subagents.

## Workflow

1. **Select Plan**: Choose from available plans in `knowledge/plans/`
2. **Review Summary**: Confirm the execution plan with dependency graph
3. **Execute Subtasks**: Subagents work on subtasks per dependency order
4. **Track Progress**: Monitor completion and handle blockers
5. **Final Review**: Code, architecture, and test reviews
6. **User Approval**: Review all changes before finalization
7. **Documentation**: Update docs and capture knowledge
8. **Complete**: Mark plan as completed

## Plan Selection

When invoked, the planner will:
1. List all plans in `knowledge/plans/`
2. Show status of each (Draft, Ready, In Progress, Completed)
3. Ask which uncompleted plan to execute

## Execution Phases

### Parallel Execution
Subtasks without dependencies run simultaneously:
```
Phase 1 (Parallel):
├── Subtask 01 (xfi-engineer) ──┐
└── Subtask 02 (xfi-engineer) ──┴── Phase 2
```

### Sequential Execution
Dependent subtasks wait for their dependencies:
```
Phase 2 (After Phase 1):
└── Subtask 03 (xfi-engineer) ── Phase 3
```

## Progress Tracking

The index file is updated throughout execution:

```markdown
## Execution Progress

| Phase | Subtask | Status | Started | Completed |
|-------|---------|--------|---------|-----------|
| 1 | 01 | Completed | 10:00 | 10:15 |
| 1 | 02 | Completed | 10:00 | 10:20 |
| 2 | 03 | In Progress | 10:20 | - |
```

## Example Usage

### Basic Execution

```
/xfi-plan-execute

Execute the circular-imports-plugin plan.
```

### Resuming a Plan

```
/xfi-plan-execute

Continue execution of 20260115-caching-feature.
Subtasks 01 and 02 are complete, need to continue from subtask 03.
```

## Final Review Phase

Before completion, these reviews happen:

| Reviewer | Task |
|----------|------|
| xfi-code-reviewer | Code quality, security, patterns |
| xfi-system-design | Architecture alignment |
| xfi-testing-expert | Run global tests, verify coverage |

## User Approval

Before documentation updates, you'll review:
- All files modified
- Key accomplishments
- Review status (all should pass)
- Issues resolved during execution

## Post-Execution

After your approval:

1. **xfi-docs-expert** updates documentation
2. **xfi-system-design** captures knowledge
3. Plan status is set to "Completed"

## Troubleshooting

### Subtask Fails
- The planner will report the failure
- You can choose to retry or skip
- Failed subtasks are noted in execution log

### Tests Fail
- xfi-testing-expert will diagnose
- xfi-engineer fixes issues
- Tests re-run until passing

### Review Issues
- Issues are presented for your input
- You can approve fixes or provide direction
- Execution continues after resolution

## Related Commands

- `/xfi-plan` - Create a new plan
- `/xfi-test` - Run tests manually
- `/xfi-review` - Manual code review
- `/xfi-docs` - Manual documentation update

## Tips

1. **Start fresh**: Execute plans in a new conversation for clarity
2. **Monitor progress**: Check the index file for current status
3. **Handle blockers**: Provide input promptly when the planner stops
4. **Review thoroughly**: Take time at the user approval step
5. **Capture learnings**: Note anything useful during execution
