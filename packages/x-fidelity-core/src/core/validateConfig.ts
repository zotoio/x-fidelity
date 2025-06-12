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
  const archetype = options.archetype || 'node-fullstack';
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
      configServer: options.configServer || undefined,
      localConfigPath: options.localConfigPath || undefined,
      archetype: archetype || 'node-fullstack',
    });
    logger.info(`Checked ${exemptions.length} exemption(s).`);

    // 3. V4 approach: Rules are already in ArchetypeConfig, validate them directly
    const rules = archetypeConfig.rules || [];
    if (rules.length === 0) {
      logger.warn('No rules configured in archetype.');
    } else {
              // Validate each rule
        for (const rule of rules) {
            if (!validateRule(rule)) {
                errorCount++;
                const ruleName = typeof rule === 'string' ? rule : (rule as unknown as RuleConfig).name;
                logger.error(`Rule ${ruleName} failed validation.`);
            }
        }
      logger.info(`All ${rules.length} configured rules checked.`);
    }

    // 4. V4 approach: Facts and operators come from plugins
    logger.info('V4 approach: Facts and operators are loaded from plugins.');
    
    // Validate that required plugins are specified
    if (!archetypeConfig.plugins || archetypeConfig.plugins.length === 0) {
      errorCount++;
      logger.error('No plugins specified in archetype configuration.');
    } else {
      logger.info(`${archetypeConfig.plugins.length} plugin(s) specified in archetype.`);
      
      // Check if plugins have been loaded (they should be loaded by ConfigManager)
      const loadedFacts = await loadFacts([]);  // Empty array since facts come from plugins
      const loadedOperators = await loadOperators();  // Operators come from plugins
      
      logger.info(`Loaded ${loadedFacts.length} fact(s) from plugins.`);
      logger.info(`Loaded ${loadedOperators.size} operator(s) from plugins.`);
    }

    logger.info(
      'Archetype configuration, exemptions, rules, and plugin checks completed.'
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
