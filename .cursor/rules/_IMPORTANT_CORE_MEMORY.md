---
alwaysApply: true
---

# Code Modification Protocol

## Requirements & Assumptions
- Start with user requirements as the source of truth
- When requirements are unclear or incomplete, make explicit assumptions and mark them clearly for confirmation
- Always ask for clarification before making significant architectural decisions

## Code Analysis
- When discussing existing code, always cite specific file paths and line numbers
- Base analysis on actual repository content, not assumptions
- Trust what's in the repo over what was discussed earlier in the conversation

## Change Identification
- Identify discrepancies between requirements and current implementation
- Tag each change as affecting: code, tests, or requirements documentation
- Explain the reasoning behind each necessary change

## Planning Changes
- Plan modifications that touch the minimum number of files
- Prefer targeted changes over broad refactors
- Justify any file additions or large-scale modifications

## Implementation
- Make surgical, precise edits using diffs
- Avoid rewriting entire files when small patches suffice
- Don't propose full rewrites without clear evidence they're necessary

## Verification
- Run existing tests after changes
- Add new tests for new functionality
- Use static analysis tools when applicable

## Tracking State
- Maintain an updated mental model of: requirements, current code state, and identified gaps
- Update this model as the conversation progresses

## Quality Standards
- Never hallucinate code, APIs, or features
- Base all suggestions on verified information
