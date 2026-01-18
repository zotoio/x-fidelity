#!/usr/bin/env node
/**
 * Bundle fixtures script for Rule Builder GUI
 * 
 * This script bundles test fixture files from packages/x-fidelity-fixtures
 * into JSON files that can be loaded in the browser for rule simulation.
 * 
 * Usage: node scripts/bundle-fixtures.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FIXTURE_PATH = path.resolve(__dirname, '../../../packages/x-fidelity-fixtures/node-fullstack');
const OUTPUT_DIR = path.resolve(__dirname, '../src/lib/fixtures');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'node-fullstack.json');

// Exclude patterns
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.xfiResults',
  '.vscode-test-user-data',
  '.nyc_output',
  '__snapshots__',
];
const EXCLUDE_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.lock', '.blob', '.log',
];
const EXCLUDE_FILES = [
  'yarn.lock',
  'package-lock.json',
  '.DS_Store',
  '.xfidelity-cache.json',
  'test-results.json',
  'coverage-final.json',
  'file-cache.json',
];

// Max file size to include (50KB)
const MAX_FILE_SIZE = 50 * 1024;

// Bundle size target (500KB warning threshold)
const BUNDLE_SIZE_WARNING = 500 * 1024;

/**
 * @typedef {Object} FileEntry
 * @property {string} content - File content (may be truncated)
 * @property {string} extension - File extension (e.g., '.ts')
 * @property {number} size - Original file size in bytes
 * @property {boolean} [truncated] - Whether content was truncated
 */

/**
 * @typedef {Object} FileTreeNode
 * @property {string} name - File or directory name
 * @property {string} path - Relative path from fixture root
 * @property {'file'|'directory'} type - Node type
 * @property {FileTreeNode[]} [children] - Child nodes for directories
 */

/**
 * @typedef {Object} FixtureBundle
 * @property {string} name - Fixture name
 * @property {string} description - Fixture description
 * @property {Object.<string, FileEntry>} files - Map of path to file entry
 * @property {Object} packageJson - Parsed package.json
 * @property {FileTreeNode[]} fileTree - Hierarchical file tree
 * @property {Object} metadata - Bundle metadata
 */

/**
 * Check if a file/directory should be excluded
 * @param {string} name - File or directory name
 * @param {string} ext - File extension
 * @returns {boolean}
 */
function shouldExclude(name, ext) {
  if (EXCLUDE_DIRS.includes(name)) return true;
  if (EXCLUDE_FILES.includes(name)) return true;
  if (EXCLUDE_EXTENSIONS.includes(ext.toLowerCase())) return true;
  // Exclude hidden directories/files (except .gitignore and specific allowed ones)
  if (name.startsWith('.') && name !== '.gitignore') return true;
  return false;
}

/**
 * Get language from file extension
 * @param {string} ext - File extension
 * @returns {string}
 */
function getLanguage(ext) {
  const languageMap = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.json': 'JSON',
    '.md': 'Markdown',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.html': 'HTML',
    '.yaml': 'YAML',
    '.yml': 'YAML',
  };
  return languageMap[ext.toLowerCase()] || 'Other';
}

/**
 * Recursively walk directory and collect files
 * @param {string} dir - Directory to walk
 * @param {string} basePath - Base path for relative paths
 * @returns {{ files: Object.<string, FileEntry>, tree: FileTreeNode[], languages: Set<string> }}
 */
function walkDirectory(dir, basePath = '') {
  const files = {};
  const tree = [];
  const languages = new Set();

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  // Sort entries: directories first, then files, alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const ext = path.extname(entry.name);

    if (shouldExclude(entry.name, ext)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subResult = walkDirectory(fullPath, relativePath);
      
      // Merge results
      Object.assign(files, subResult.files);
      subResult.languages.forEach(lang => languages.add(lang));
      
      tree.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children: subResult.tree,
      });
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let truncated = false;

        if (stats.size > MAX_FILE_SIZE) {
          content = content.substring(0, MAX_FILE_SIZE) + 
            '\n\n/* ... [Content truncated - file exceeds 50KB] ... */';
          truncated = true;
        }

        files[relativePath] = {
          content,
          extension: ext,
          size: stats.size,
          ...(truncated && { truncated: true }),
        };

        languages.add(getLanguage(ext));

        tree.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
        });
      } catch (error) {
        // Skip files that can't be read as text
        console.warn(`Skipping ${relativePath}: ${error.message}`);
      }
    }
  }

  return { files, tree, languages };
}

/**
 * Main bundling function
 */
function bundleFixture() {
  console.log('Bundling node-fullstack fixture...');
  console.log(`Source: ${FIXTURE_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }

  // Check if fixture path exists
  if (!fs.existsSync(FIXTURE_PATH)) {
    console.error(`ERROR: Fixture path does not exist: ${FIXTURE_PATH}`);
    process.exit(1);
  }

  // Walk the fixture directory
  const { files, tree, languages } = walkDirectory(FIXTURE_PATH);

  // Read package.json separately
  const packageJsonPath = path.join(FIXTURE_PATH, 'package.json');
  let packageJson = {};
  if (fs.existsSync(packageJsonPath)) {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  }

  // Rules this fixture triggers (from RULE_COVERAGE.md)
  const triggersRules = [
    'sensitiveLogging-iterative',
    'noDatabases-iterative',
    'functionComplexity-iterative',
    'functionCount-iterative',
    'codeRhythm-iterative',
    'factDoesNotAddResultToAlmanac-iterative',
    'invalidSystemIdConfigured-iterative',
    'lowMigrationToNewComponentLib-global',
    'newSdkFeatureNotAdoped-global',
    'outdatedFramework-global',
    'nonStandardDirectoryStructure-global',
    'missingRequiredFiles-global',
    'openaiAnalysisTop5-global',
    'openaiAnalysisA11y-global',
    'openaiAnalysisTestCriticality-global',
  ];

  // Build the bundle
  /** @type {FixtureBundle} */
  const bundle = {
    name: 'node-fullstack',
    description: 'Node.js full-stack archetype test fixture with intentionally problematic code to exercise all 15 node-fullstack archetype rules. Contains examples of sensitive logging, database calls, complexity issues, and more.',
    files,
    packageJson,
    fileTree: tree,
    metadata: {
      totalFiles: Object.keys(files).length,
      languages: Array.from(languages).sort(),
      triggersRules,
      generatedAt: new Date().toISOString(),
      bundleVersion: '1.0.0',
    },
  };

  // Write the bundle
  const jsonContent = JSON.stringify(bundle, null, 2);
  fs.writeFileSync(OUTPUT_PATH, jsonContent);

  // Calculate and report size
  const bundleSize = Buffer.byteLength(jsonContent, 'utf-8');
  const bundleSizeKB = (bundleSize / 1024).toFixed(2);

  console.log('Bundle created successfully!');
  console.log('');
  console.log('Statistics:');
  console.log(`  - Total files: ${bundle.metadata.totalFiles}`);
  console.log(`  - Languages: ${bundle.metadata.languages.join(', ')}`);
  console.log(`  - Rules triggered: ${triggersRules.length}`);
  console.log(`  - Bundle size: ${bundleSizeKB} KB`);
  
  if (bundleSize > BUNDLE_SIZE_WARNING) {
    console.warn(`\n⚠️  Warning: Bundle size exceeds ${BUNDLE_SIZE_WARNING / 1024}KB target`);
  } else {
    console.log(`  ✓ Bundle size is within ${BUNDLE_SIZE_WARNING / 1024}KB target`);
  }

  // Verify JSON is valid by parsing it back
  try {
    JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log('  ✓ JSON is valid and parseable');
  } catch (error) {
    console.error(`\n❌ ERROR: Generated JSON is invalid: ${error.message}`);
    process.exit(1);
  }

  console.log('\nDone!');
}

// Run the bundler
bundleFixture();
