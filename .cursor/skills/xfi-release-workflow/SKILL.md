---
name: xfi-release-workflow
description: Guide for managing X-Fidelity releases using the unified release system. Use when releasing, versioning, troubleshooting release issues, or writing commit messages.
---

# X-Fidelity Release Workflow

This skill guides you through the unified release process for X-Fidelity.

## Release System Overview

X-Fidelity uses a unified release system that synchronizes versions between:
- **CLI package** (`x-fidelity`) - Published to npm
- **VSCode extension** (`x-fidelity-vscode`) - Published to VS Marketplace and Open VSX

Both packages always share the same version number.

## Commit Convention Reference

Releases are triggered automatically by conventional commits. Use `yarn commit` for guided commit creation.

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

These do NOT trigger releases:

| Type | Use For |
|------|---------|
| `docs:` | Documentation changes |
| `style:` | Code formatting, whitespace |
| `chore:` | Maintenance, tooling |
| `refactor:` | Code restructuring without behavior change |
| `test:` | Adding or updating tests |
| `build:` | Build system changes |
| `ci:` | CI/CD changes |

### Commit Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Examples:**

```bash
# Feature (minor release)
feat(plugins): add new complexity threshold operator

# Bug fix (patch release)  
fix(vscode): resolve diagnostic not clearing on fix

# Breaking change (major release)
feat(core): redesign plugin initialization API

BREAKING CHANGE: Plugin initialize() now receives PluginContext instead of logger
```

## Workflow Checklist

```
Release Workflow:
- [ ] Ensure all tests pass: yarn test
- [ ] Verify build succeeds: yarn build
- [ ] Create conventional commit
- [ ] Push to master branch
- [ ] Monitor GitHub Actions
- [ ] Verify published packages
```

## Local Testing

### Dry Run

Test what would be released without actually publishing:

```bash
yarn release:dry-run
```

This shows:
- Next version number
- Changelog preview
- Packages that would be published

### Full Local Release (Development)

```bash
# Requires environment variables
GH_TOKEN=xxx VSCE_PAT=xxx OVSX_PAT=xxx yarn release
```

## Automated Release Process

When commits are pushed to `master`:

1. **Commit Analysis**: Determines version bump from commit messages
2. **Version Update**: Updates package.json in CLI and VSCode packages
3. **Changelog Generation**: Updates CHANGELOG.md
4. **Build**: Runs production builds
5. **Publish CLI**: Publishes to npm via OIDC trusted publishing
6. **Publish VSCode**: Publishes to VS Marketplace and Open VSX
7. **GitHub Release**: Creates release with VSIX and CLI artifacts
8. **Git Commit**: Commits version bumps back to repo

## Environment Variables

For local releases or CI configuration:

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `GH_TOKEN` | GitHub releases and git operations | GitHub Settings > Developer settings > PAT |
| `VSCE_PAT` | VS Code Marketplace publishing | VS Marketplace > Manage Publishers |
| `OVSX_PAT` | Open VSX Registry publishing | Open VSX > Access Tokens |

**Note**: `NPM_TOKEN` is not required - CLI uses npm trusted publishing via OIDC.

## Troubleshooting

### Release Not Triggered

1. **Check commit format**: Must follow conventional commits
2. **Verify commit type**: Only `feat`, `fix`, `perf`, `revert`, `bump` trigger releases
3. **Check branch**: Must be on `master` (or `beta` for prereleases)

```bash
# View recent commits with their types
git log --oneline -10
```

### Partial Release Failure

If one package fails to publish:

1. Check GitHub Actions workflow logs
2. CLI and VSCode publishing are independent
3. Retry by pushing an empty fix commit:

```bash
git commit --allow-empty -m "fix: retry release"
git push
```

### Version Mismatch

Should not occur with unified releases. If it does:

1. Check both package.json files have same version
2. Verify last release commit wasn't corrupted
3. Run `yarn release:dry-run` to see expected state

### Token Errors

```
# Test VS Marketplace token
vsce verify-pat -p $VSCE_PAT

# Test GitHub token
gh auth status
```

## Release Branches

| Branch | Release Type | npm Tag |
|--------|--------------|---------|
| `master` | Stable | `latest` |
| `beta` | Prerelease | `beta` |

Prerelease versions: `1.2.3-beta.1`, `1.2.3-beta.2`, etc.

## Post-Release Verification

After release completes:

```bash
# Verify npm package
npm view x-fidelity version

# Verify global install
npm install -g x-fidelity@latest
xfi --version

# Check VS Marketplace
# Visit: https://marketplace.visualstudio.com/items?itemName=zotoio.x-fidelity-vscode
```

## Key Files

| File | Purpose |
|------|---------|
| `.releaserc.json` | semantic-release configuration |
| `scripts/prepare-unified-release.js` | Pre-publish version updates |
| `scripts/publish-unified-release.js` | Publish both packages |
| `.github/workflows/release-unified.yml` | GitHub Actions workflow |
| `CHANGELOG.md` | Auto-generated changelog |

## Quick Reference

```bash
# Create proper commit
yarn commit

# Test release locally
yarn release:dry-run

# View changelog
cat CHANGELOG.md

# Check current versions
cat packages/x-fidelity-cli/package.json | grep version
cat packages/x-fidelity-vscode/package.json | grep version
```
