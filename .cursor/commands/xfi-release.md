# xfi-release

Prepare for an X-Fidelity release following the unified release workflow.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-release-workflow` skill at `.cursor/skills/xfi-release-workflow/SKILL.md`
- **Subagents**: Use `xfi-testing-expert` and `xfi-docs-expert` in parallel for pre-release checks

## Workflow

1. **Read the skill file** for complete release process details

2. **Run pre-release checks in parallel**:
   - `xfi-testing-expert`: Verify all tests pass
   - `xfi-docs-expert`: Verify documentation is up to date

3. **Execute release preparation**:
   ```bash
   # Run full test suite
   yarn test
   
   # Verify build succeeds
   yarn build
   
   # Check what would be released
   yarn release:dry-run
   ```

4. **Verify commit messages** follow conventional format:
   - `feat:` → Minor release (0.X.0)
   - `fix:` → Patch release (0.0.X)
   - `BREAKING CHANGE:` → Major release (X.0.0)

5. **Create release commit** using proper format

## Release Checklist

```
Release Preparation:
- [ ] All tests pass: yarn test
- [ ] Build succeeds: yarn build
- [ ] Dry run reviewed: yarn release:dry-run
- [ ] Documentation updated
- [ ] Commit message follows conventional format
- [ ] No uncommitted changes
```

## Commit Convention Reference

### Release-Triggering Commits

| Type | Version Bump | Example |
|------|--------------|---------|
| `feat:` | Minor (0.X.0) | `feat: add new rule for React hooks` |
| `fix:` | Patch (0.0.X) | `fix: resolve AST parsing for arrow functions` |
| `perf:` | Patch | `perf: optimize file scanning` |
| `revert:` | Patch | `revert: undo breaking change` |
| `bump:` | Patch | `bump: update dependencies` |
| `BREAKING CHANGE:` | Major (X.0.0) | Include in commit body |

### Non-Release Commits

| Type | Use For |
|------|---------|
| `docs:` | Documentation changes |
| `style:` | Code formatting |
| `chore:` | Maintenance, tooling |
| `refactor:` | Code restructuring |
| `test:` | Adding or updating tests |
| `build:` | Build system changes |
| `ci:` | CI/CD changes |

## Release Commands

```bash
# Interactive commit creation
yarn commit

# Dry run to preview release
yarn release:dry-run

# Check current versions
cat packages/x-fidelity-cli/package.json | grep version
cat packages/x-fidelity-vscode/package.json | grep version
```

## Post-Release Verification

```bash
# Verify npm package
npm view x-fidelity version

# Verify global install
npm install -g x-fidelity@latest
xfi --version
```

## Key Files

- `.releaserc.json` - semantic-release configuration
- `scripts/prepare-unified-release.js` - Pre-publish version updates
- `scripts/publish-unified-release.js` - Publish both packages
- `.github/workflows/release-unified.yml` - GitHub Actions workflow
- `CHANGELOG.md` - Auto-generated changelog
