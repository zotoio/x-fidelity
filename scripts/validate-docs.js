#!/usr/bin/env node
/*
  Validate docs for:
  1) Broken relative links to other docs (.md paths)
  2) JSON code blocks parse
  3) CLI flags referenced in docs exist in packages/x-fidelity-cli/src/cli.ts
*/

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'website', 'docs');
const CLI_FILE = path.join(__dirname, '..', 'packages', 'x-fidelity-cli', 'src', 'cli.ts');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(p);
  }
  return out;
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
      // split short/long
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

function main() {
  const errors = [];

  const cliFlags = getCliFlags();
  const docs = walk(DOCS_DIR);

  for (const file of docs) {
    const md = fs.readFileSync(file, 'utf8');

    // 1) JSON validation
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
      const target = path.resolve(path.dirname(file), l);
      if (!fs.existsSync(target)) errors.push(`Broken link in ${file}: ${l}`);
    }

    // 3) CLI flags usage
    const used = extractCliFlagsFromMarkdown(md);
    used.forEach(f => {
      // allow URLs like -- in http
      if (!f.startsWith('--')) return;
      if (!cliFlags.has(f)) {
        // whitelist known external switches or content
        const whitelist = new Set([
          // none currently
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
