# Engineering Plans

This directory contains engineering plan files created by the xfi-planner agent.

## Directory Structure

Each plan is stored in its own directory:

```
knowledge/plans/
├── [yyyymmdd]-[feature-name]/
│   ├── index-[feature-name]-[yyyymmdd].md
│   ├── subtask-01-[feature]-[subtask-name]-[yyyymmdd].md
│   ├── subtask-02-[feature]-[subtask-name]-[yyyymmdd].md
│   └── ...
└── README.md (this file)
```

## Plan Lifecycle

1. **Draft**: Plan is being created, not yet ready for execution
2. **Ready for Review**: Plan is complete and awaiting user review
3. **In Progress**: Plan execution has started
4. **Completed**: All subtasks completed and verified

## Plan Commands

- `/xfi-plan` - Create a new plan
- `/xfi-plan-execute` - Execute an existing plan

## File Types

### Index File
`index-[feature-name]-[yyyymmdd].md`

The primary plan document containing:
- Overview and requirements
- Key decisions
- Subtask dependency graph
- Execution order (parallel/sequential phases)
- Global definition of done
- Execution notes and progress tracking

### Subtask Files
`subtask-[NN]-[feature]-[subtask-name]-[yyyymmdd].md`

Individual work unit documents containing:
- Objective and deliverables
- Assigned subagent
- Dependencies on other subtasks
- Definition of done
- Testing strategy (no global tests during execution)
- Execution notes (filled by executing agent)

## Example Plan

```
knowledge/plans/20260118-circular-import-detection/
├── index-circular-import-detection-20260118.md
├── subtask-01-circular-import-detection-types-20260118.md
├── subtask-02-circular-import-detection-ast-analysis-20260118.md
├── subtask-03-circular-import-detection-rule-20260118.md
└── subtask-04-circular-import-detection-tests-20260118.md
```

## Notes

- Plans are **executable prompts** - they contain all context needed for agents
- During plan execution, agents update their subtask files with execution notes
- The index file tracks overall progress and completion status
- Plans serve as documentation of what was done and why
