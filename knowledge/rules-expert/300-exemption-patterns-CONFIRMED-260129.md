# Topic: Exemption Patterns

## Fact: Exemption File Structure and Format
### Modified: 2026-01-29
### Priority: H

Exemptions allow temporarily bypassing specific rules for specific repositories:

**Exemption Array Format:**
```json
[
    {
        "repoUrl": "git@github.com:zotoio/x-fidelity.git",
        "rule": "outdatedFramework-global",
        "expirationDate": "2025-12-31",
        "reason": "Upgrading dependencies is scheduled for Q4 2025"
    },
    {
        "repoUrl": "git@github.com:zotoio/x-fidelity.git",
        "rule": "sensitiveLogging-iterative",
        "expirationDate": "2025-09-30",
        "reason": "Security audit and logging refactor planned for Q3 2025"
    }
]
```

**Required Fields:**
- `repoUrl`: Git repository URL (SSH or HTTPS format, normalized internally)
- `rule`: Exact rule name including suffix (e.g., `outdatedFramework-global`)
- `expirationDate`: ISO date string (YYYY-MM-DD) when exemption expires

**Optional Fields:**
- `reason`: Human-readable justification for the exemption

**Validation:** The system validates that all three required fields are strings and ignores malformed exemptions.

### References
1. [node-fullstack-exemptions.json](../../packages/x-fidelity-democonfig/src/node-fullstack-exemptions.json)
2. [exemptionUtils.ts - validation logic](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)

---

## Fact: Exemption Loading - Local and Remote Sources
### Modified: 2026-01-29
### Priority: H

Exemptions can be loaded from two sources: local files or remote config server.

**Local Loading (two patterns):**

1. **Legacy single file:** `{archetype}-exemptions.json`
   ```
   config/
   └── node-fullstack-exemptions.json
   ```

2. **Team/Project directory:** `{archetype}-exemptions/`
   ```
   config/
   └── node-fullstack-exemptions/
       ├── team-alpha-node-fullstack-exemptions.json
       ├── team-beta-node-fullstack-exemptions.json
       └── project-x-node-fullstack-exemptions.json
   ```
   
   Files must end with `-{archetype}-exemptions.json` to be loaded.

**Remote Loading:**
```
GET /archetypes/{archetype}/exemptions
```

Remote exemptions are fetched from the config server with optional shared secret authentication.

**Merging Behavior:**
- All exemptions from all sources are merged into a single array
- Duplicate exemptions (same repo + rule) are allowed
- First matching exemption that hasn't expired takes effect

### References
1. [exemptionUtils.ts - loadLocalExemptions](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)
2. [exemptionUtils.ts - loadRemoteExemptions](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)

---

## Fact: Exemption Matching and Expiration Logic
### Modified: 2026-01-29
### Priority: H

The `isExempt` function determines if a rule should be bypassed:

**Matching Criteria (all must be true):**
1. `repoUrl` matches (after normalization to SSH format)
2. `rule` exactly matches the rule name
3. `expirationDate` is in the future

**URL Normalization:**
All repository URLs are normalized to SSH format for comparison:
- `https://github.com/org/repo` → `git@github.com:org/repo.git`
- `git@github.com:org/repo` → `git@github.com:org/repo.git`
- `org/repo` → `git@github.com:org/repo.git`

**Expiration Handling:**
```typescript
new Date(exemption.expirationDate) > new Date()
```
- Exemptions with past dates are silently ignored
- Missing expiration date defaults to `2099-12-31` (never expires)

**Engine Behavior:**
When a rule is exempted, the engine clones the rule and changes its event type to `exempt`. This allows:
- Tracking that the rule was evaluated
- Logging the exemption for audit purposes
- Sending telemetry about exemption usage

### References
1. [exemptionUtils.ts - isExempt function](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)
2. [engineSetup.ts - exemption handling](../../packages/x-fidelity-core/src/core/engine/engineSetup.ts)

---

## Fact: Team and Project Exemption Organization
### Modified: 2026-01-29
### Priority: M

Exemptions can be organized by team or project for easier management:

**Directory Structure Pattern:**
```
{archetype}-exemptions/
├── {team}-{archetype}-exemptions.json      # Team-level exemptions
├── {project}-{archetype}-exemptions.json   # Project-specific exemptions
└── global-{archetype}-exemptions.json      # Org-wide exemptions
```

**Example for `node-fullstack` archetype:**
```
node-fullstack-exemptions/
├── platform-team-node-fullstack-exemptions.json
├── mobile-team-node-fullstack-exemptions.json
├── project-alpha-node-fullstack-exemptions.json
└── security-global-node-fullstack-exemptions.json
```

**Best Practices:**
1. Use descriptive prefixes that identify the owner (team/project)
2. Include justification in the `reason` field for audit trails
3. Set realistic expiration dates to encourage timely remediation
4. Review exemptions periodically and remove expired ones
5. Use project-level exemptions for temporary migrations
6. Use team-level exemptions for cross-project standards

**Path Security:**
The system validates that exemption file paths stay within the exemptions directory (prevents path traversal attacks).

### References
1. [exemptionUtils.ts - loadLocalExemptions](../../packages/x-fidelity-core/src/utils/exemptionUtils.ts)
2. [node-fullstack-exemptions.json](../../packages/x-fidelity-democonfig/src/node-fullstack-exemptions.json)
