import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfigSchema, RuleConfigSchema } from '../src/types/typeDefs';

const ajv = new Ajv();

const validateArchetypeSchema = ajv.compile(ArchetypeConfigSchema);
const validateRuleSchema = ajv.compile(RuleConfigSchema);

function validateJsonFiles(directory: string, schema: any) {
  const files = fs.readdirSync(directory);
  files.forEach(file => {
    if (path.extname(file) === '.json') {
      const filePath = path.join(directory, file);
      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const valid = schema(fileContent);
      if (!valid) {
        console.error(`Validation failed for ${filePath}`);
        console.error(schema.errors);
        process.exit(1);
      } else {
        console.log(`Validation passed for ${filePath}`);
      }
    }
  });
}

// Validate archetypes
validateJsonFiles(path.join(__dirname, '../src/archetypes'), validateArchetypeSchema);

// Validate rules
validateJsonFiles(path.join(__dirname, '../src/rules'), validateRuleSchema);

console.log('All schemas validated successfully');
