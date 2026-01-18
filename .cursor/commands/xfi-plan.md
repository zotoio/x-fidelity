# xfi-plan

Create a comprehensive engineering plan for a new X-Fidelity feature or initiative.

## Instructions

Use the **xfi-planner subagent** with the **xfi-create-plan skill** to plan complex engineering initiatives through a structured workflow.

## Workflow

1. **Capture Initial Input**: Gather the feature/initiative description from the user
2. **Invoke xfi-planner**: The planner takes over to guide the planning process
3. **Requirements Gathering**: Answer clarifying questions (up to 10)
4. **Design Consultation**: xfi-system-design provides architectural input
5. **Confirm Decisions**: Review and approve key decisions
6. **Create Plan Files**: Index and subtask files are generated
7. **Review**: Code reviewer and system design review the plan
8. **Finalize**: Plan is ready for execution

## Plan Output

Plans are created in `knowledge/plans/[yyyymmdd]-[feature-name]/`:

```
knowledge/plans/20260118-my-feature/
├── index-my-feature-20260118.md          # Main plan with dependency graph
├── subtask-01-my-feature-setup-20260118.md
├── subtask-02-my-feature-types-20260118.md
└── subtask-03-my-feature-impl-20260118.md
```

## Example Usage

### Planning a New Plugin

```
/xfi-plan

I want to create a new plugin that detects circular imports in TypeScript files.
It should:
- Use AST analysis to find import statements
- Build a dependency graph
- Detect cycles and report them as warnings
- Work with both ES modules and CommonJS
```

### Planning a Cross-Package Feature

```
/xfi-plan

Add caching support for remote configuration fetching.
Requirements:
- Cache configs locally to reduce network calls
- Support TTL-based expiration
- Allow force refresh
- Work in both CLI and VSCode extension
```

### Planning a Refactoring Initiative

```
/xfi-plan

Refactor the error handling across all packages to use StandardError consistently.
Goals:
- Audit existing error patterns
- Create migration plan
- Update all packages systematically
- Improve error messages for users
```

## Plan Execution

Once a plan is created and reviewed, execute it in a new session:

```
/xfi-plan-execute
```

This will:
1. Show available plans
2. Let you select which plan to execute
3. Coordinate subagents to complete subtasks
4. Track progress and verify completion

## Key Features

### Structured Planning
- Up to 10 clarifying questions
- Design consultation with architecture expert
- User confirmation at key decision points

### Subtask Delegation
- Appropriate subagents create subtask files
- Each subtask has clear deliverables and DoD
- Testing restrictions to avoid conflicts

### Plan Review
- Code reviewer checks completeness
- System design verifies architecture
- User gets final approval before execution

## Related Commands

- `/xfi-plan-execute` - Execute an existing plan
- `/xfi-design` - Get architecture design input (used within planning)
- `/xfi-review` - Review code changes (used within planning)

## Tips

1. **Be specific**: The more detail you provide upfront, the fewer questions needed
2. **Think about scope**: Large initiatives may be split into multiple plans
3. **Consider dependencies**: Mention any existing work this builds on
4. **Identify risks**: Known concerns help with planning
5. **Review carefully**: Plans are easier to change before execution begins
