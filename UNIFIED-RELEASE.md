# Unified Release System

This document describes the new unified release system that ensures synchronized versions between the CLI package and VSCode extension.

## Overview

The unified release system replaces the complex dual-release mechanism with a single semantic-release configuration at the root level. This ensures:

- ✅ **Perfect version synchronization** between CLI and VSCode extension
- ✅ **Simplified release workflow** with single point of control
- ✅ **Correct CLI version display** (no more placeholder versions)
- ✅ **Reduced maintenance complexity** by eliminating sync logic

## How it Works

1. **Single Release Process**: One semantic-release run handles both packages
2. **Version Synchronization**: Both packages get the same version number
3. **Automated Publishing**: CLI goes to npm, VSCode extension to marketplaces
4. **Artifact Management**: All artifacts are created and verified in one process

## Configuration

### Root Level
- `.releaserc.json` - Main semantic-release configuration
- `scripts/prepare-unified-release.js` - Prepares both packages for release
- `scripts/publish-unified-release.js` - Publishes both packages
- `.github/workflows/release-unified.yml` - GitHub Actions workflow

### Package Level
- Individual package `release` scripts now show warning messages about using root-level releases
- Package-specific semantic-release configurations have been removed

## Usage

### Automated Releases (Recommended)
Releases are triggered automatically when commits are pushed to the `master` branch:

```bash
# Create a feature commit
git commit -m "feat: add new functionality"
git push origin master
# → Triggers unified release workflow
```

### Manual Releases (Development/Testing)
You can test releases locally using:

```bash
# Dry run to see what would be released
yarn release:dry-run

# Actual release (requires proper environment variables)
yarn release
```

### Required Environment Variables
- `GH_TOKEN` - GitHub token for releases and git operations
- `VSCE_PAT` - Visual Studio Code marketplace token
- `OVSX_PAT` - Open VSX registry token

**Note:** `NPM_TOKEN` is no longer required. The CLI is published using [npm trusted publishing via OIDC](https://docs.npmjs.com/trusted-publishers), which provides enhanced security by eliminating the need for long-lived tokens.

## Commit Conventions

The system uses conventional commits to determine release types:

- `feat:` → Minor version bump
- `fix:`, `perf:`, `revert:`, `bump:` → Patch version bump
- `BREAKING CHANGE:` → Major version bump
- `docs:`, `style:`, `chore:`, `refactor:`, `test:`, `build:`, `ci:` → No release

## Migration Notes

### What Changed
- ❌ **Removed**: Complex dual-release workflows (.github/workflows/release.yml)
- ❌ **Removed**: PR version sync automation (.github/workflows/pr-version-sync.yml)
- ❌ **Removed**: Package-specific semantic-release configurations
- ❌ **Removed**: Forced release mechanisms and sync commits
- ✅ **Added**: Root-level unified semantic-release
- ✅ **Added**: Simplified release scripts
- ✅ **Added**: Single workflow for both packages

### What Stayed the Same
- Conventional commit format
- Release triggers (push to master)
- Marketplace publishing (VSCode Marketplace + Open VSX)
- CLI npm publishing
- Artifact generation and upload

## Benefits

1. **Version Accuracy**: CLI always shows the correct version, not placeholder
2. **Guaranteed Sync**: Impossible to have version mismatches between packages
3. **Simplified Maintenance**: Single configuration to maintain
4. **Reduced Complexity**: No more complex sync logic or forced releases
5. **Better Reliability**: Fewer moving parts means fewer potential failures
6. **Standard Practices**: Follows semantic-release monorepo patterns

## Troubleshooting

### Release Not Triggered
- Check that commits follow conventional format
- Verify the commit affects releasable code (not just docs/tests)
- Check GitHub Actions workflow logs

### CLI Shows Wrong Version
- This should no longer happen with unified releases
- If it does, check that the build process is using the updated package.json

### Partial Release Failures
- The system is designed to handle partial failures gracefully
- CLI and VSCode extension publishing are independent within the same release
- Check individual publishing logs for specific errors

### Environment Variable Issues
- Ensure all required tokens are set in GitHub Secrets
- Test token validity if publishing fails

## Support

For issues with the unified release system:
1. Check GitHub Actions workflow logs
2. Run `yarn release:dry-run` locally to test configuration
3. Review semantic-release logs for detailed error information
4. Verify all environment variables are correctly configured