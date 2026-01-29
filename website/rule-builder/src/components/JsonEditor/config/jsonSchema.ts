/**
 * JSON Schema configuration for Monaco Editor
 *
 * Re-exports the X-Fidelity rule schema for use in Monaco validation.
 * This enables inline validation with error markers in the editor gutter.
 */

import { ruleSchema } from '../../../lib/validation/ruleSchema';

/**
 * Schema URI for Monaco registration
 */
export const RULE_SCHEMA_URI = 'https://x-fidelity.dev/schemas/rule.json';

/**
 * Get the rule schema for Monaco validation
 * Returns the schema as a plain object for Monaco's JSON language service
 */
export function getRuleJsonSchema(): Record<string, unknown> {
  return ruleSchema as Record<string, unknown>;
}
