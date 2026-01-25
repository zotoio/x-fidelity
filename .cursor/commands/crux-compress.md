# crux-compress

Compress markdown rule files with `crux: true` frontmatter into CRUX notation for token efficiency.

## Usage

```
/crux-compress ALL                    - Compress all eligible rules in .cursor/rules/
/crux-compress @path/to/file.md       - Compress a specific file reference
/crux-compress @file1.md @file2.md    - Compress multiple file references
```

## Instructions

### When invoked with file reference(s) (`@path/to/file.md`)

1. **For each file reference provided**, spawn a **fresh `crux-cursor-rule-manager` subagent instance**:
   - Each file gets its own dedicated agent instance
   - Multiple file references are processed in parallel
   - Task the subagent:
     ```
     Compress this rule file into CRUX notation:
     - Source: <file path>
     - Output: <file path with .crux.mdc extension>
     - Follow CRUX.md specification
     - Report before/after token counts
     - If source lacks `crux: true` frontmatter, add it first
     - Ensure source uses .md extension (rename from .mdc if needed)
     ```

2. **Pre-processing for each file** (if needed):
   - If the file is `.mdc` but not `.crux.mdc`, rename to `.md` first
   - If the file lacks `crux: true` in frontmatter, add it
   - Then proceed with compression

3. **Collect results** and report:
   - File processed
   - Token reduction achieved
   - Any issues encountered

### When invoked with `ALL`

1. **Find all eligible files**:
   - Search `.cursor/rules/**/*.md` for files with frontmatter `crux: true`
   - Exclude files that already have a `.crux.mdc` extension (they are outputs, not sources)
   
2. **For each eligible file**, spawn a **separate `crux-cursor-rule-manager` subagent instance**:
   - Task the subagent to compress the source file
   - The subagent will:
     - Read the CRUX specification from `CRUX.md`
     - Compress the source file
     - Create/update the `[filename].crux.mdc` version
     - Report token reduction metrics
   - Run subagents in parallel for efficiency

3. **Collect results** from all subagents and report summary:
   - Number of files processed
   - Files created/updated
   - Files skipped (already compact or compression not beneficial)
   - Total token savings

## Eligibility Criteria

A file is eligible for CRUX compression if:
- Located in `.cursor/rules/` directory
- Has `.md` extension (not `.mdc` - those are already cursor rule files or compressed outputs)
- Has `crux: true` in YAML frontmatter
- Is not already a `.crux.mdc` file (outputs are not recompressed)

## Adding New Files for Compression

To make a rule file eligible for CRUX compression:

1. Ensure the source file uses `.md` extension (not `.mdc`)
2. Add `crux: true` to the YAML frontmatter:
   ```yaml
   ---
   crux: true
   alwaysApply: true  # or other frontmatter
   ---
   ```
3. Run `/crux-compress ALL` or `/crux-compress @path/to/file.md`

## Source vs Output Convention

| Type | Extension | Example |
|------|-----------|---------|
| Source (human-readable) | `.md` | `core-tenets.md` |
| Compressed (token-efficient) | `.crux.mdc` | `core-tenets.crux.mdc` |

**Important**: The CRUX header in compressed files references the source file:
```
«CRUX⟨core-tenets.md⟩»
```

## Example Parallel Execution

### With `ALL`
When `/crux-compress ALL` finds 3 eligible files:

```
Launch in parallel (fresh agent per file):
├── crux-cursor-rule-manager → core-tenets.md → core-tenets.crux.mdc
├── crux-cursor-rule-manager → xfi-coding-standards.md → xfi-coding-standards.crux.mdc
└── crux-cursor-rule-manager → vscode-optimise.md → vscode-optimise.crux.mdc
```

### With file references
When `/crux-compress @.cursor/rules/core-tenets.md @.cursor/rules/xfi-coding-standards.md`:

```
Launch in parallel (fresh agent per file):
├── crux-cursor-rule-manager → core-tenets.md → core-tenets.crux.mdc
└── crux-cursor-rule-manager → xfi-coding-standards.md → xfi-coding-standards.crux.mdc
```

### Single file
When `/crux-compress @.cursor/rules/core-tenets.md`:

```
Launch single agent:
└── crux-cursor-rule-manager → core-tenets.md → core-tenets.crux.mdc
```

## Related

- `crux-cursor-rule-manager` subagent - The specialist that performs compression
- `CRUX.md` - The CRUX notation specification
- `.cursor/rules/_CRUX-RULE.mdc` - Rules for working with CRUX files
