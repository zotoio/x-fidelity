# xfi-create-plugin

Create a new X-Fidelity analysis plugin with facts, operators, tests, and sample rules.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-create-plugin` skill at `.cursor/skills/xfi-create-plugin/SKILL.md`
- **Subagent**: Use `xfi-plugin-expert` for architecture guidance and implementation details

## Workflow

1. **Read the skill file** to get the step-by-step plugin creation guide
2. **Gather requirements** from the user:
   - What should the plugin analyze?
   - What data should the fact(s) collect?
   - What comparisons should the operator(s) perform?
   - Is this for iterative (per-file) or global (repo-wide) analysis?

3. **Use xfi-plugin-expert subagent** for:
   - Plugin architecture guidance
   - AST analysis patterns (if needed)
   - Best practices for fact/operator implementation

4. **Create the plugin structure**:
   ```
   packages/x-fidelity-plugins/src/xfiPlugin{Name}/
   ├── index.ts                  # Plugin definition
   ├── types.ts                  # Plugin-specific types (optional)
   ├── facts/
   │   ├── {name}Fact.ts         # Fact implementation
   │   └── {name}Fact.test.ts    # Fact tests
   ├── operators/
   │   ├── {name}Operator.ts     # Operator implementation
   │   └── {name}Operator.test.ts # Operator tests
   └── sampleRules/
       └── {name}-rule.json      # Example rule
   ```

5. **Register the plugin** in `packages/x-fidelity-plugins/src/index.ts`

6. **Run tests** to verify:
   ```bash
   yarn workspace @x-fidelity/plugins test
   yarn test
   ```

## Plugin Checklist

```
Plugin Creation Progress:
- [ ] Step 1: Create plugin directory structure
- [ ] Step 2: Create plugin index.ts
- [ ] Step 3: Create fact(s)
- [ ] Step 4: Create operator(s)
- [ ] Step 5: Add tests for facts and operators
- [ ] Step 6: Create sample rule(s)
- [ ] Step 7: Register plugin in main index
- [ ] Step 8: Run tests to verify
```

## Key References

- Template plugin: `packages/x-fidelity-plugins/src/xfiPluginSimpleExample/`
- Plugin types: `packages/x-fidelity-types/src/plugins.ts`
- Shared utils: `packages/x-fidelity-plugins/src/sharedPluginUtils/`
- Plugin registry: `packages/x-fidelity-plugins/src/index.ts`

## Requirements

- 100% test coverage for all facts and operators
- Graceful error handling (return safe defaults on error)
- Use `pluginLogger` for debugging information
- Include working sample rules demonstrating usage
