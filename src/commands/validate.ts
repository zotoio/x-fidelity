import { ConfigManager } from '../core/configManager';
import { options } from '../core/cli';
import { validateArchetype, validateRule } from '../utils/jsonSchemas';
import { loadRules } from '../utils/ruleUtils';
import { loadFacts } from '../facts';
import { loadOperators } from '../operators';
import { loadExemptions } from '../utils/exemptionUtils';
import { logger } from '../utils/logger';

export async function validateArchetypeConfig(): Promise<void> {
  const archetype = options.archetype;
  try {
    // Load the archetype configuration
    const config = await ConfigManager.getConfig({ archetype });
    const archetypeConfig = config.archetype;

    // 1. Validate the archetype JSON schema
    if (!validateArchetype(archetypeConfig)) {
      logger.error('Archetype configuration failed schema validation.');
      process.exit(1);
    } else {
      logger.info('Archetype configuration schema validation passed.');
    }

    // 2. Load and validate exemptions
    const exemptions = await loadExemptions({
      configServer: options.configServer || '',
      localConfigPath: options.localConfigPath || '',
      archetype,
    });
    logger.info(`Loaded ${exemptions.length} exemption(s).`);

    // 3. Load and validate all referenced rules
    const rules = await loadRules({
      archetype,
      ruleNames: archetypeConfig.rules,
      configServer: options.configServer,
      localConfigPath: options.localConfigPath,
      logPrefix: '',
    });
    if (rules.length !== archetypeConfig.rules.length) {
      logger.error(
        `Expected ${archetypeConfig.rules.length} rule(s) but loaded ${rules.length}.`
      );
      process.exit(1);
    } else {
      // Optionally run validateRule() on each loaded rule for additional checks
      for (const rule of rules) {
        if (!validateRule(rule)) {
          logger.error(`Rule ${rule.name} failed validation.`);
          process.exit(1);
        }
      }
      logger.info('All rules loaded and validated successfully.');
    }

    // 4. Load and validate facts
    const facts = await loadFacts(archetypeConfig.facts);
    if (facts.length !== archetypeConfig.facts.length) {
      logger.error(
        `Expected ${archetypeConfig.facts.length} fact(s) but loaded ${facts.length}.`
      );
      process.exit(1);
    } else {
      logger.info('All facts loaded successfully.');
    }

    // 5. Load and validate operators
    const operators = await loadOperators(archetypeConfig.operators);
    if (operators.length !== archetypeConfig.operators.length) {
      logger.error(
        `Expected ${archetypeConfig.operators.length} operator(s) but loaded ${operators.length}.`
      );
      process.exit(1);
    } else {
      logger.info('All operators loaded successfully.');
    }

    logger.info(
      'Archetype configuration, exemptions, rules, facts, and operators validated successfully.'
    );
    process.exit(0);
  } catch (error) {
    logger.error(`Error during validation: ${error}`);
    process.exit(1);
  }
}
