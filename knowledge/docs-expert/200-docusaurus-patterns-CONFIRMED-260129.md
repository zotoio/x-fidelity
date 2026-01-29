# Topic: Docusaurus Patterns

## Fact: Website Uses Docusaurus Classic Preset With Mermaid Support
### Modified: 2026-01-29
### Priority: H

The X-Fidelity documentation website is built with Docusaurus and configured in `website/docusaurus.config.js`:

**Core Configuration:**
```javascript
module.exports = {
  title: 'x-fidelity',
  tagline: 'Advanced Framework Adherence Checker',
  url: 'https://zotoio.github.io',
  baseUrl: '/x-fidelity/',
  organizationName: 'zotoio',
  projectName: 'x-fidelity',
  trailingSlash: false,
  
  presets: [
    ['@docusaurus/preset-classic', {
      docs: {
        sidebarPath: require.resolve('./sidebars.js'),
        editUrl: 'https://github.com/zotoio/x-fidelity/edit/main/website/',
        remarkPlugins: [[require('remark-mermaid'), {}]],
      },
      theme: {
        customCss: require.resolve('./src/css/custom.css'),
      },
    }],
  ],
  
  markdown: {
    mermaid: true,
  },
  
  themes: ['@docusaurus/theme-mermaid'],
};
```

**Key features enabled:**
- Mermaid diagrams in Markdown (via `@docusaurus/theme-mermaid`)
- Dark mode by default with toggle support
- Edit links pointing to GitHub
- Broken link checking (`onBrokenLinks: 'throw'`)

### References
1. [website/docusaurus.config.js](../../website/docusaurus.config.js)

---

## Fact: Sidebar Organizes Docs Into Nine Categories
### Modified: 2026-01-29
### Priority: H

The sidebar configuration in `website/sidebars.js` organizes documentation into a hierarchical structure:

```javascript
module.exports = {
  docs: [
    'intro',
    'getting-started',
    'key-concepts',
    { type: 'category', label: 'VSCode Extension', items: [...] },
    { type: 'category', label: 'Packages', items: [...] },
    { type: 'category', label: 'Core Features', items: [...] },
    { type: 'category', label: 'Rule Creation', items: [...] },
    { type: 'category', label: 'Configuration', items: [...] },
    { type: 'category', label: 'Server', items: [...] },
    { type: 'category', label: 'Extending', items: [...] },
    { type: 'category', label: 'CI/CD Integration', items: [...] },
    { type: 'category', label: 'Examples', items: [...] },
    { type: 'category', label: 'Contributing', items: [...] },
  ],
};
```

**Category contents:**
- **VSCode Extension**: overview, installation, features, development
- **Core Features**: archetypes, rules, operators, facts, exemptions, openai, notifications
- **Rule Creation**: hello-rule, rules-cookbook, rule-builder-guide, rule-builder-templates
- **Configuration**: local-config, remote-config, xfi-config, environment-variables
- **Extending**: plugins overview, creating plugins, plugin examples, best practices

When adding new docs, place them in the appropriate category and update `sidebars.js`.

### References
1. [website/sidebars.js](../../website/sidebars.js)

---

## Fact: Website Has 52 Markdown Documentation Files
### Modified: 2026-01-29
### Priority: M

The `website/docs/` directory contains documentation organized in subdirectories:

**Top-level docs (entry points):**
- `intro.md` - Documentation introduction
- `getting-started.md` - Installation and first steps
- `quickstart.md` - Quick start guide
- `key-concepts.md` - Core concepts overview

**Subdirectory organization:**
- `vscode-extension/` - 5 files (overview, installation, features, development, command-delegation)
- `plugins/` - 6 files (overview, creating, examples, best-practices, hello-plugin, extract-values)
- `rules/` - 4 files (hello-rule, cookbook, builder-guide, builder-templates)
- `ci-cd/` - 4 files (overview, github-actions, gitlab-ci, jenkins)
- `examples/` - 2 files (migration-dashboard, recipes)
- `server/` - 1 file (quick-server-setup)
- `packages/` - 1 file (core)
- `contributing/` - 1 file (building-with-cursor)

**Core feature docs:**
- archetypes.md, rules.md, operators.md, facts.md, exemptions.md
- openai-integration.md, library-migration-tracking.md, notifications.md

When adding new documentation, follow the existing structure and update sidebars.js accordingly.

### References
1. [website/docs/](../../website/docs/)
2. [website/docs/intro.md](../../website/docs/intro.md)
3. [website/sidebars.js](../../website/sidebars.js)

---

## Fact: Rule Builder Is A Standalone React Application
### Modified: 2026-01-29
### Priority: M

The Rule Builder is a visual rule creation tool hosted at `https://zotoio.github.io/x-fidelity/rule-builder/`:

**Location:** `website/rule-builder/` (161 files in subtree: 99 *.ts, 48 *.tsx, 4 *.json)

**Features:**
- Visual tree and form interface for building rules
- Live JSON synchronization with bidirectional updates
- Pre-built templates for common use cases
- Rule simulation and testing before deployment

**Integration with docs:**
- Link in navbar pointing to `/rule-builder/`
- Documentation in `website/docs/rules/rule-builder-guide.md`
- Templates documented in `website/docs/rules/rule-builder-templates.md`

**Static hosting:**
- Served from `website/static/rule-builder/index.html`
- Built separately from main Docusaurus site

### References
1. [website/rule-builder/](../../website/rule-builder/)
2. [website/static/rule-builder/index.html](../../website/static/rule-builder/index.html)
3. [website/docs/rules/rule-builder-guide.md](../../website/docs/rules/rule-builder-guide.md)
