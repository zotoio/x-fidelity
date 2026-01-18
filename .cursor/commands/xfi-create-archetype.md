# xfi-create-archetype

Create a new X-Fidelity archetype configuration for a project type.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-create-archetype` skill at `.cursor/skills/xfi-create-archetype/SKILL.md`
- **Subagent**: Use `xfi-rules-expert` for archetype configuration and rule selection

## What is an Archetype?

An archetype is a project template that defines:
- Which rules to apply
- Minimum dependency versions
- Expected directory structure
- File inclusion/exclusion patterns
- Notification settings
- Exemption configurations

## Workflow

1. **Read the skill file** to get the step-by-step archetype creation guide
2. **Gather requirements** from the user:
   - Target project type (Node.js, Java, Python, etc.)
   - Framework focus (React, Spring Boot, Django, etc.)
   - Strictness level (development vs production)
   - Team-specific requirements

3. **Use xfi-rules-expert subagent** for:
   - Rule selection for the archetype
   - Exemption configuration
   - Best practices for archetype design

4. **Create the archetype**:
   - Create archetype JSON in `packages/x-fidelity-democonfig/src/`
   - Configure rules, dependencies, structure
   - Create exemptions file
   - Test with CLI

## Archetype Structure

```
packages/x-fidelity-democonfig/src/
├── {archetype-name}.json                    # Main archetype config
├── {archetype-name}-exemptions.json         # Default exemptions
└── {archetype-name}-exemptions/             # Team/project exemptions
    ├── team1-{archetype-name}-exemptions.json
    └── project1-{archetype-name}-exemptions.json
```

## Archetype Checklist

```
Archetype Creation:
- [ ] Step 1: Define archetype purpose
- [ ] Step 2: Create archetype JSON
- [ ] Step 3: Select rules to include
- [ ] Step 4: Configure dependency versions
- [ ] Step 5: Define directory structure
- [ ] Step 6: Set file patterns
- [ ] Step 7: Create exemptions file
- [ ] Step 8: Test the archetype
```

## Testing

```bash
# Run with your archetype
cd /path/to/test/project
xfi --archetype my-archetype --configServer local

# Debug mode
xfi --archetype my-archetype --configServer local --debug
```

## Reference Archetypes

- `node-fullstack` - Full-featured Node.js template
- `java-microservice` - Java Spring Boot template

## Key Files

- Archetypes: `packages/x-fidelity-democonfig/src/*.json`
- Rules: `packages/x-fidelity-democonfig/src/rules/`
- Exemptions: `packages/x-fidelity-democonfig/src/*-exemptions/`
