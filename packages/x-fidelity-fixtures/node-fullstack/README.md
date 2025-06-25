# Node-Fullstack Fixture

This is a test fixture designed to trigger every rule in the `node-fullstack` archetype for X-Fidelity testing.

## Purpose

This fixture ensures comprehensive testing by creating files that trigger each rule consistently:

## Rule Coverage

### ✅ Rules with Trigger Files

1. **sensitiveLogging-iterative** - Triggered by:
   - `src/components/UserAuth.tsx` (API keys, passwords, tokens)
   - `src/utils/database.js` (extensive sensitive data logging)

2. **outdatedFramework-global** - Triggered by:
   - `package.json` (outdated React 16.14.0, TypeScript 4.5.0, etc.)

3. **noDatabases-iterative** - Triggered by:
   - `src/utils/database.js` (oracle, postgres, mongodb patterns)

4. **nonStandardDirectoryStructure-global** - Triggered by:
   - `wrongStructure/badDir/problematicCode.js` (violates app/frontend, app/server structure)

5. **invalidSystemIdConfigured-iterative** - Triggered by:
   - `src/xfiTestMatch.json` (invalid systemId: "invalidSystem123")

6. **factDoesNotAddResultToAlmanac-iterative** - Triggered by:
   - `src/facts/problematicFact.ts` (missing almanac.addRuntimeFact call)

7. **functionCount-iterative** - Triggered by:
   - `src/facts/manyFunctionsFact.ts` (25+ functions in facts file)

8. **functionComplexity-iterative** - Triggered by:
   - `src/components/ComplexComponent.tsx` (high cyclomatic/cognitive complexity)

9. **codeRhythm-iterative** - Triggered by:
   - `src/components/PoorRhythmComponent.tsx` (inconsistent formatting/spacing)

10. **lowMigrationToNewComponentLib-global** - Triggered by:
    - `src/components/LegacyUIComponent.tsx` (antd imports, no MUI)

11. **newSdkFeatureNotAdoped-global** - Triggered by:
    - `src/utils/sdkUsage.ts` (only 1 "processUserData" usage, below threshold)

12. **missingRequiredFiles-global** - Triggered by:
    - Missing file: `missingRequiredFiles-testing.js` (required by rule config)

### 🤖 OpenAI Analysis Rules

13. **openaiAnalysisTop5-global** - Triggered by:
    - `src/components/AccessibilityIssues.tsx` (multiple code quality issues)

14. **openaiAnalysisA11y-global** - Triggered by:
    - `src/components/AccessibilityIssues.tsx` (accessibility violations)

15. **openaiAnalysisTestCriticality-global** - Triggered by:
    - `src/components/AccessibilityIssues.tsx` (hard-to-test critical functionality)

## File Structure

```
src/
├── components/
│   ├── UserAuth.tsx              # Sensitive logging violations
│   ├── ComplexComponent.tsx      # Function complexity violations  
│   ├── PoorRhythmComponent.tsx   # Code rhythm violations
│   ├── LegacyUIComponent.tsx     # Component migration violations
│   └── AccessibilityIssues.tsx  # A11y and testing issues
├── utils/
│   ├── database.js               # Database connection violations
│   └── sdkUsage.ts              # SDK adoption violations
├── facts/
│   ├── problematicFact.ts        # Missing almanac violations
│   └── manyFunctionsFact.ts      # Function count violations
└── xfiTestMatch.json            # Invalid system ID

wrongStructure/
└── badDir/
    └── problematicCode.js        # Directory structure violations

package.json                      # Outdated framework violations
```

## Expected Rule Triggers

When X-Fidelity analyzes this fixture, it should consistently trigger:
- **11 Warnings** (most rules)
- **4 Fatalities** (outdatedFramework, invalidSystemId, missingRequiredFiles, lowMigration)

## Notes

- OpenAI rules require API access and may not trigger in all test environments
- The `missingRequiredFiles-global` rule expects `missingRequiredFiles-testing.js` to be absent
- Package dependencies are intentionally outdated to trigger framework rules
- All sensitive data patterns are fake and for testing purposes only

## Usage

This fixture should be used with the `node-fullstack` archetype configuration to ensure all rules have consistent trigger files for testing and validation. 