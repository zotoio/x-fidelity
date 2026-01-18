# xfi-create-rule

Create a new X-Fidelity analysis rule with proper structure and archetype integration.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-create-rule` skill at `.cursor/skills/xfi-create-rule/SKILL.md`
- **Subagent**: Use `xfi-rules-expert` for rule design and json-rules-engine expertise

## Workflow

1. **Read the skill file** to get the step-by-step rule creation guide
2. **Gather requirements** from the user:
   - What condition should the rule check?
   - Is this global (once per repo) or iterative (per file)?
   - What event type: `warning` (informational) or `fatality` (blocks CI)?

3. **Use xfi-rules-expert subagent** for:
   - Rule structure guidance
   - Condition logic (all vs any)
   - Operator selection
   - Archetype integration

4. **Create the rule**:
   - Find or create required fact
   - Find or create required operator
   - Write rule JSON in `packages/x-fidelity-democonfig/src/rules/`
   - Add to appropriate archetype

5. **Test the rule**:
   ```bash
   yarn workspace @x-fidelity/plugins test
   cd packages/x-fidelity-fixtures/node-fullstack
   yarn xfi --configServer local --archetype node-fullstack --debug
   ```

## Rule Types

| Type | Suffix | When It Runs | Example Use Case |
|------|--------|--------------|------------------|
| **Global** | `-global` | Once per repository | Missing required files, dependency checks |
| **Iterative** | `-iterative` | Once per matching file | Code complexity, pattern detection |

## Rule Checklist

```
Rule Creation Progress:
- [ ] Step 1: Define rule purpose and type
- [ ] Step 2: Find or create required fact
- [ ] Step 3: Find or create required operator
- [ ] Step 4: Write rule JSON
- [ ] Step 5: Add to archetype
- [ ] Step 6: Test the rule
```

## Existing Facts by Plugin

| Plugin | Facts |
|--------|-------|
| `xfiPluginAst` | `functionComplexity`, `functionCount`, `astFact` |
| `xfiPluginDependency` | `repoDependencyFacts` |
| `xfiPluginFilesystem` | `repoFilesystemFacts` |
| `xfiPluginPatterns` | `globalFileAnalysis` |
| `xfiPluginReactPatterns` | `effectCleanup`, `hookDependency` |
| `xfiPluginRequiredFiles` | `missingRequiredFiles` |

## Key Files

- Rules: `packages/x-fidelity-democonfig/src/rules/`
- Archetypes: `packages/x-fidelity-democonfig/src/*.json`
- Facts: `packages/x-fidelity-plugins/src/xfiPlugin*/facts/`
- Operators: `packages/x-fidelity-plugins/src/xfiPlugin*/operators/`
