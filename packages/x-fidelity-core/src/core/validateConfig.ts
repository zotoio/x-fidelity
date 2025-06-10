import { ConfigManager } from './configManager';
import { options } from './options';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { loadRules } from '../utils/ruleUtils';
import { loadFacts } from '../facts';
import { loadOperators } from '../operators';
import { loadExemptions } from '../utils/exemptionUtils';
import { logger } from '../utils/logger';
import { RuleConfig } from '@x-fidelity/types';

export async function validateArchetypeConfig(): Promise<void> {
  const archetype = options.archetype || 'node-fullstack'; // Provide fallback
  let errorCount = 0;
  try {
    // Load the archetype configuration
    const config = await ConfigManager.getConfig({ archetype });
    const archetypeConfig = config.archetype;

    // 1. Validate the archetype JSON schema
    if (!validateArchetype(archetypeConfig)) {
      errorCount++;
      logger.error('Archetype configuration failed schema validation.');
    } else {
      logger.info('Archetype configuration schema validation passed.');
    }

    // 2. Load and validate exemptions
    const exemptions = await loadExemptions({
      configServer: options.configServer || '',
      localConfigPath: options.localConfigPath || '',
      archetype,
    });
    logger.info(`Checked ${exemptions.length} exemption(s).`);

    // 3. Load and validate all referenced rules
    const rules = await loadRules({
      archetype,
      ruleNames: archetypeConfig.rules,
      configServer: options.configServer,
      localConfigPath: options.localConfigPath,
      logPrefix: '',
    });
    if (rules.length !== archetypeConfig.rules.length) {
      errorCount++;
      logger.error(
        `Expected ${archetypeConfig.rules.length} rule(s) but loaded ${rules.length}.`
      );
      
    } else {
      // Optionally run validateRule() on each loaded rule for additional checks
      for (const rule of rules) {
        if (!validateRule(rule)) {
          errorCount++;
          logger.error(`Rule ${(rule as RuleConfig).name} failed validation.`);
        }
      }
      logger.info('All configured rules checked.');
    }

    // 4. Load and validate facts
    const facts = await loadFacts(archetypeConfig.facts);
    if (facts.length !== archetypeConfig.facts.length) {
      errorCount++;
      logger.error(
        `Expected ${archetypeConfig.facts.length} fact(s) but loaded ${facts.length}.`
      );
    } else {
      logger.info('All  facts checked.');
    }

    // 5. Load and validate operators
    const operators = await loadOperators();
    if (operators.size !== archetypeConfig.operators.length) {
      errorCount++;
      logger.error(
        `Expected ${archetypeConfig.operators.length} operator(s) but loaded ${operators.size}.`
      );
    } else {
      logger.info('All operators loaded successfully.');
    }

    logger.info(
      'Archetype configuration, exemptions, rules, facts, and operator checks completed.'
    );
  } catch (error) {
    logger.error(`Unexpected error during validation: ${error}`);
    errorCount++;
  }
  
  if (errorCount > 0) {
    logger.error(`
\n=================================================
 FAILED: ${errorCount} CONFIG VALIDATION CHECKS.
=================================================\n`);
    process.exit(1);
  } else {
    logger.info(`
\n===============================================
 SUCCESS: ALL CONFIG VALIDATION CHECKS PASSED!
===============================================\n`);
    process.exit(0);
  }
}
