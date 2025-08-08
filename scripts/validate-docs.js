#!/usr/bin/env node
/*
  Validate docs (focused mode by default) for:
  1) Broken relative links to other docs (.md paths)
  2) JSON code blocks parse
  3) CLI flags referenced in docs exist in packages/x-fidelity-cli/src/cli.ts

  Set FULL_DOCS=1 to scan all docs (may be noisy until all legacy pages are normalized).
*/

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'website', 'docs');
const CLI_FILE = path.join(__dirname, '..', 'packages', 'x-fidelity-cli', 'src', 'cli.ts');

// Focused validation set (kept strict)
const FOCUSED_DOCS = [
  'quickstart.md',
  'cli-reference.md',
  'vscode-extension/features.md',
  'result-files-and-conventions.md',
  'rules/hello-rule.md',
  'rules/rules-cookbook.md',
  'plugins/hello-plugin.md',
  'plugins/overview.md',
  'examples/recipes.md',
  'server/quick-server-setup.md',
  'troubleshooting.md',
  'packages/core.md',
  'environment-variables.md',
  'intro.md'
].map(p => path.join(DOCS_DIR, p));

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function stripFrontmatter(md) {
  if (md.startsWith('---')) {
    const end = md.indexOf('\n---', 3);
    if (end !== -1) return md.slice(end + 4);
  }
  return md;
}

function extractCodeBlocks(md) {
  const blocks = [];
  const regex = /```(json|JSON)([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(md))) {
    blocks.push({ lang: m[1], code: m[2].trim() });
  }
  return blocks;
}

function extractLinks(md) {
  const links = [];
  const regex = /\[(?:[^\]]+)\]\((\.\.?\/[^)\s#]+)(?:#[^)]+)?\)/g;
  let m;
  while ((m = regex.exec(md))) {
    links.push(m[1]);
  }
  return links;
}

function getCliFlags() {
  const src = fs.readFileSync(CLI_FILE, 'utf8');
  const optRegex = /\.option\(([^\)]+)\)/g;
  const flags = new Set();
  let m;
  while ((m = optRegex.exec(src))) {
    const text = m[1];
    const mflag = text.match(/['"]([^'"]+)['"]/);
    if (mflag) {
      const flagText = mflag[1];
      flagText.split(/[ ,]/).forEach(part => {
        const long = part.trim();
        if (long.startsWith('--')) flags.add(long);
      });
    }
  }
  return flags;
}

function extractCliFlagsFromMarkdown(md) {
  const flags = new Set();
  const regex = /\s(--[a-zA-Z0-9-]+)/g;
  let m;
  while ((m = regex.exec(md))) flags.add(m[1]);
  return flags;
}

function resolveDocLink(fromFile, rel) {
  const base = path.resolve(path.dirname(fromFile), rel);
  if (fs.existsSync(base)) return base;
  if (!path.extname(base)) {
    const withMd = base + '.md';
    if (fs.existsSync(withMd)) return withMd;
  }
  return null;
}

function main() {
  const errors = [];

  const cliFlags = getCliFlags();
  const scanAll = process.env.FULL_DOCS === '1';
  const docs = scanAll ? walk(DOCS_DIR) : FOCUSED_DOCS.filter(fs.existsSync);

  for (const file of docs) {
    const raw = fs.readFileSync(file, 'utf8');
    const md = stripFrontmatter(raw);

    // 1) JSON validation (focused pages only)
    const blocks = extractCodeBlocks(md);
    for (const b of blocks) {
      try {
        JSON.parse(b.code);
      } catch (e) {
        errors.push(`Invalid JSON in ${file}`);
      }
    }

    // 2) Relative link existence
    const links = extractLinks(md);
    for (const l of links) {
      const target = resolveDocLink(file, l);
      if (!target) errors.push(`Broken link in ${file}: ${l}`);
    }

    // 3) CLI flags usage (focused pages only)
    const used = extractCliFlagsFromMarkdown(md);
    used.forEach(f => {
      if (!cliFlags.has(f)) {
        const whitelist = new Set([
          '--help',
          '--version'
        ]);
        if (!whitelist.has(f)) errors.push(`Unknown CLI flag in ${file}: ${f}`);
      }
    });
  }

  if (errors.length) {
    console.error('Docs validation failed:\n' + errors.map(e => ` - ${e}`).join('\n'));
    process.exit(1);
  } else {
    console.log('Docs validation passed.');
  }
}

main();
