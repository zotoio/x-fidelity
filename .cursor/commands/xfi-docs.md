# xfi-docs

Update X-Fidelity documentation to stay in sync with code changes.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-documentation-update` skill at `.cursor/skills/xfi-documentation-update/SKILL.md`
- **Subagent**: Use `xfi-docs-expert` for documentation expertise

## Workflow

1. **Read the skill file** for complete documentation guidelines

2. **Use xfi-docs-expert subagent** to:
   - Identify which documentation needs updating
   - Write clear, concise documentation
   - Ensure consistency across all docs

3. **Update affected documentation**:
   - README.md (if user-facing changes)
   - Website docs in `website/docs/` (if feature/behavior changes)
   - AGENTS.md (if structure/commands change)
   - Package READMEs (if package API changes)

4. **Validate documentation**:
   ```bash
   yarn docs:validate
   ```

5. **Preview website changes**:
   ```bash
   cd website
   yarn start
   ```

## Documentation Locations

| Type | Location | Purpose |
|------|----------|---------|
| Main README | `README.md` | Overview, installation, quick start |
| Website docs | `website/docs/` | Detailed documentation (Docusaurus) |
| Package READMEs | `packages/*/README.md` | Package-specific docs |
| VSCode extension | `packages/x-fidelity-vscode/DEVELOPMENT.md` | Extension development |
| AI guidance | `AGENTS.md` | Instructions for AI agents |

## Documentation Checklist

```
Documentation Update:
- [ ] Identify affected documentation
- [ ] Update README.md if needed
- [ ] Update website docs if needed
- [ ] Update package READMEs if needed
- [ ] Run docs validation
- [ ] Preview website changes
```

## When to Update Docs

| Change Type | Docs to Update |
|-------------|----------------|
| New CLI flag | README, `website/docs/cli-reference.md` |
| New command | README, `website/docs/cli-reference.md` |
| New rule | `website/docs/rules/` |
| New plugin | `website/docs/plugins/` |
| New archetype | README, `website/docs/examples/` |
| Config change | README, `website/docs/` |
| API change | Affected package README |
| VSCode feature | `packages/x-fidelity-vscode/README.md` |

## Website Structure

```
website/docs/
├── intro.md                    # Introduction
├── quickstart.md               # Getting started
├── cli-reference.md            # CLI commands
├── troubleshooting.md          # Common issues
├── plugins/                    # Plugin docs
├── rules/                      # Rules docs
├── server/                     # Server docs
└── vscode-extension/           # VSCode docs
```

## Validation

```bash
# Validate focused docs (default)
yarn docs:validate

# Validate all docs
FULL_DOCS=1 yarn docs:validate

# Preview website
cd website && yarn start
```

## Writing Guidelines

- Use clear, direct language
- Include code examples
- Use admonitions for tips/warnings
- Keep content concise
- Remove obsolete content when updating
