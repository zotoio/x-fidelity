import * as yaml from 'js-yaml';
import chalk from 'chalk';

interface YamlColorizeOptions {
  indent?: number;
  skipInvalid?: boolean;
  flowLevel?: number;
}

/**
 * Colorize YAML string with syntax highlighting
 */
export function colorizeYamlString(yamlStr: string): string {
  const lines = yamlStr.split('\n');
  
  return lines.map(line => {
    if (!line.trim()) return line;
    return colorizeYamlLine(line);
  }).join('\n');
}

function colorizeYamlLine(line: string): string {
  // Check if this is a level field line first, before processing quotes
  const levelFieldMatch = line.match(/^(\s*)(level):\s*["']([^"']+)["']/);
  if (levelFieldMatch) {
    const [, indent, key, levelValue] = levelFieldMatch;
    const coloredKey = `${indent}${chalk.blue(key)}:`;
    const coloredValue = colorizeLevelValue(`"${levelValue}"`);
    
    // Handle any comments
    const commentIndex = line.indexOf('#');
    const commentPart = commentIndex !== -1 ? chalk.gray(line.substring(commentIndex)) : '';
    
    return `${coloredKey} ${coloredValue}${commentPart}`;
  }
  
  // Check if this is a filePath field in an issueDetails array item, before processing quotes
  const issueDetailsFilePathMatch = line.match(/^(\s*- )(filePath):\s*["']([^"']+)["']/);
  if (issueDetailsFilePathMatch) {
    const [, arrayItemPrefix, key, filePathValue] = issueDetailsFilePathMatch;
    const coloredKey = `${arrayItemPrefix}${chalk.blue(key)}:`;
    const coloredValue = colorizeFilePathValue(`"${filePathValue}"`);
    
    // Handle any comments
    const commentIndex = line.indexOf('#');
    const commentPart = commentIndex !== -1 ? chalk.gray(line.substring(commentIndex)) : '';
    
    return `${coloredKey} ${coloredValue}${commentPart}`;
  }
  
  // Extract quoted strings first and replace with placeholders
  const quotedStrings: string[] = [];
  let workingLine = line;
  
  // Handle double-quoted strings (with proper escape handling)
  workingLine = workingLine.replace(/"((?:[^"\\]|\\.)*)"/g, (match, content) => {
    const index = quotedStrings.length;
    quotedStrings.push(chalk.green(match));
    return `__QUOTED_${index}__`;
  });
  
  // Handle single-quoted strings
  workingLine = workingLine.replace(/'((?:[^'\\]|\\.)*)'/g, (match, content) => {
    const index = quotedStrings.length;
    quotedStrings.push(chalk.green(match));
    return `__QUOTED_${index}__`;
  });
  
  // Now handle comments (only outside of quoted strings)
  let commentPart = '';
  const commentIndex = workingLine.indexOf('#');
  if (commentIndex !== -1) {
    commentPart = chalk.gray(line.substring(commentIndex));
    workingLine = workingLine.substring(0, commentIndex);
  }
  
  // Handle YAML syntax on the remaining content
  workingLine = applySyntaxHighlighting(workingLine);
  
  // Restore quoted strings
  quotedStrings.forEach((quotedString, index) => {
    workingLine = workingLine.replace(`__QUOTED_${index}__`, quotedString);
  });
  
  return workingLine + commentPart;
}

function applySyntaxHighlighting(line: string): string {
  // Array items - special handling for filePath fields
  if (/^\s*-\s/.test(line)) {
    // Check if this array item contains a filePath field
    const arrayFilePathMatch = line.match(/^(\s*-\s)(filePath):\s*(.*)$/);
    if (arrayFilePathMatch) {
      const [, prefix, key, valueContent] = arrayFilePathMatch;
      const coloredPrefix = prefix.replace(/^(\s*)-(\s)/, `$1${chalk.cyan('-')}$2`);
      const coloredKey = `${chalk.blue(key)}:`;
      
      if (!valueContent.trim()) return `${coloredPrefix}${coloredKey}`;
      
      const coloredValue = colorizeFilePathValue(valueContent);
      return `${coloredPrefix}${coloredKey} ${coloredValue}`;
    }
    
    // Regular array item processing
    return line.replace(/^(\s*)-(\s)/, `$1${chalk.cyan('-')}$2`);
  }
  
  // Key-value pairs
  const keyValueMatch = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
  if (keyValueMatch) {
    const [, indent, key, valueContent] = keyValueMatch;
    const coloredKey = `${indent}${chalk.blue(key)}:`;
    
    if (!valueContent.trim()) return coloredKey;
    
    // Special handling for 'level' field values
    if (key === 'level') {
      const coloredValue = colorizeLevelValue(valueContent);
      return `${coloredKey} ${coloredValue}`;
    }
    

    
    // Color the value (which may contain placeholders for quoted strings)
    const coloredValue = colorizeUnquotedValue(valueContent);
    return `${coloredKey} ${coloredValue}`;
  }
  
  return line;
}

function colorizeUnquotedValue(value: string): string {
  const trimmed = value.trim();
  
  // Skip if it contains quoted string placeholders
  if (trimmed.includes('__QUOTED_')) {
    return trimmed;
  }
  
  // Booleans
  if (trimmed === 'true' || trimmed === 'false') {
    return chalk.magenta(trimmed);
  }
  
  // null/undefined
  if (trimmed === 'null' || trimmed === '~' || trimmed === '') {
    return chalk.gray(trimmed || 'null');
  }
  
  // Numbers
  if (/^\d+\.?\d*$/.test(trimmed)) {
    return chalk.yellow(trimmed);
  }
  
  // Default unquoted strings
  return chalk.white(trimmed);
}

function colorizeLevelValue(value: string): string {
  const trimmed = value.trim();
  
  // Skip if it contains quoted string placeholders
  if (trimmed.includes('__QUOTED_')) {
    return trimmed;
  }
  
  // Remove quotes if present to get the actual value
  const cleanValue = trimmed.toLowerCase().replace(/^["']|["']$/g, '');
  
  // Apply level-specific colors
  if (cleanValue === 'fatality' || cleanValue === 'error') {
    return chalk.red.bold(trimmed); // Bright red
  }
  
  if (cleanValue === 'warning') {
    return chalk.hex('#FF8C00').bold(trimmed); // Bright orange
  }
  
  if (cleanValue === 'exempt') {
    return chalk.magenta.bold(trimmed); // Bright purple
  }
  
  // Default coloring for unknown level values
  return chalk.white(trimmed);
}

function colorizeFilePathValue(value: string): string {
  const trimmed = value.trim();
  
  // Skip if it contains quoted string placeholders
  if (trimmed.includes('__QUOTED_')) {
    return trimmed;
  }
  
  // Apply bright cyan coloring to file paths
  return chalk.cyan.bold(trimmed);
}

/**
 * Convert any object to colorized YAML string
 */
export function colorizeYaml(data: any, options: YamlColorizeOptions = {}): string {
  const yamlOptions = {
    indent: options.indent ?? 2,
    skipInvalid: options.skipInvalid ?? false,
    flowLevel: options.flowLevel ?? -1,
    defaultStyle: null,
    lineWidth: -1
  };
  
  try {
    const yamlStr = yaml.dump(data, yamlOptions);
    return colorizeYamlString(yamlStr);
  } catch (error) {
    return chalk.red(`Error serializing to YAML: ${error}`);
  }
}

/**
 * Colorize an already-stringified YAML string
 */
export function colorizeYamlText(yamlString: string): string {
  return colorizeYamlString(yamlString);
}

// Example usage
if (require.main === module) {
  const sampleData = {
    app: {
      name: "My Application",
      version: "1.2.3",
      debug: true,
      port: 3000,
      database: {
        host: "localhost",
        port: 5432,
        ssl: false,
        credentials: null
      }
    },
    features: ["auth", "logging", "metrics"],
    regex: {
      pattern: "\\systemId\\;[\\s]*\\([a-zA-Z0-9]*\\)",
      flags: "gi"
    },
    comments: {
      description: "This has # hashes and : colons in the string",
      note: 'Single quotes with # too'
    }
  };
  
  // Convert object to colorized YAML
  //console.log(colorizeYaml(sampleData));
  
  // Or colorize existing YAML string
  //const yamlString = yaml.dump(sampleData);
  //console.log(colorizeYamlText(yamlString));
}