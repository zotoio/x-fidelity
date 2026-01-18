# Subtask: Docusaurus Integration and Theming

## Metadata
- **Subtask ID**: 10
- **Feature**: Rule Builder GUI
- **Assigned Subagent**: xfi-docs-expert
- **Dependencies**: 01 (SPA Scaffold)
- **Created**: 20260118

## Objective
Integrate the Rule Builder SPA with the existing Docusaurus documentation website. Add navigation to the Rule Builder from the main menu, ensure consistent theming between the docs and the SPA, and configure the build process to include the Rule Builder in the website deployment.

## Deliverables Checklist
- [ ] Add "Rule Builder" link to Docusaurus navbar
- [ ] Create placeholder landing page in Docusaurus (if needed)
- [ ] Export CSS theme variables from Docusaurus for SPA
- [ ] Ensure dark/light mode sync between docs and SPA
- [ ] Integrate rule-builder build into website build process
- [ ] Configure proper routing for GitHub Pages
- [ ] Add link from documentation pages to Rule Builder
- [ ] Create "How to Use" documentation page

## Files to Create/Modify
```
website/
├── docusaurus.config.js              # Add navbar item
├── src/
│   ├── pages/
│   │   └── rule-builder.tsx          # Optional: redirect page
│   └── css/
│       └── custom.css                # Export theme variables
├── docs/
│   └── rules/
│       └── rule-builder-guide.md     # NEW: How to use guide
├── package.json                      # Add rule-builder build script
└── rule-builder/
    └── (built by Subtask 01)

Build output structure:
build/
├── (docusaurus output)
└── rule-builder/                     # SPA files
    ├── index.html
    └── assets/
```

## Definition of Done
- [ ] "Rule Builder" appears in top navbar
- [ ] Clicking link navigates to `/x-fidelity/rule-builder/`
- [ ] Theme is consistent with Docusaurus
- [ ] Dark/light mode toggle works
- [ ] `yarn build` in website/ builds both docs and SPA
- [ ] Built output deploys correctly to GitHub Pages
- [ ] Documentation page explains Rule Builder usage
- [ ] Links from docs pages work correctly

## Implementation Notes

### Docusaurus Config Updates
```javascript
// docusaurus.config.js
module.exports = {
  // ... existing config
  themeConfig: {
    navbar: {
      items: [
        // ... existing items
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/getting-started',
          position: 'left',
          label: 'Getting Started',
        },
        // NEW: Rule Builder link
        {
          href: '/x-fidelity/rule-builder/',
          position: 'left',
          label: 'Rule Builder',
          className: 'navbar-rule-builder',  // For custom styling
        },
        {
          href: 'https://github.com/zotoio/x-fidelity',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
  },
};
```

### CSS Theme Variable Export
```css
/* website/src/css/custom.css - add export section */

:root {
  /* X-Fidelity Theme Variables (for SPA import) */
  --xfi-color-primary: var(--ifm-color-primary);
  --xfi-color-primary-dark: var(--ifm-color-primary-dark);
  --xfi-color-primary-light: var(--ifm-color-primary-light);
  --xfi-background-color: var(--ifm-background-color);
  --xfi-font-family: var(--ifm-font-family-base);
  --xfi-heading-font-family: var(--ifm-heading-font-family);
  --xfi-color-danger: var(--ifm-color-danger);
  --xfi-color-success: var(--ifm-color-success);
  --xfi-color-warning: var(--ifm-color-warning);
}

/* Dark mode overrides */
[data-theme='dark'] {
  --xfi-background-color: #1b1b1d;
  --xfi-text-color: #e3e3e3;
}
```

### Build Script Integration
```json
// website/package.json
{
  "scripts": {
    "prebuild": "yarn clean",
    "build": "yarn build:rule-builder && docusaurus build && yarn copy:rule-builder",
    "build:rule-builder": "cd rule-builder && yarn build",
    "copy:rule-builder": "cp -r rule-builder/dist build/rule-builder",
    "start": "docusaurus start",
    "start:rule-builder": "cd rule-builder && yarn dev"
  }
}
```

### GitHub Pages Routing
The Rule Builder is at `/x-fidelity/rule-builder/`. Vite config needs:
```typescript
// rule-builder/vite.config.ts
export default defineConfig({
  base: '/x-fidelity/rule-builder/',
  // ...
});
```

### Documentation Page Content
```markdown
---
sidebar_position: 3
---

# Rule Builder GUI

The X-Fidelity Rule Builder is an interactive web-based tool for creating
analysis rules without writing JSON by hand.

## Features

- **Visual Editor**: Build rules using a tree and form interface
- **Live JSON**: Edit JSON directly with bidirectional sync
- **Templates**: Start from pre-built templates
- **Simulation**: Test rules against sample code

## Getting Started

[Launch Rule Builder](/x-fidelity/rule-builder/)

### 1. Start with a Template

Click "Templates" in the header to browse available rule templates...

### 2. Customize Your Rule

Use the form editor to modify conditions...

### 3. Test with Simulation

Expand the Simulation panel to run your rule...

### 4. Export

Click "Copy to Clipboard" to copy the rule JSON...
```

### Dark Mode Sync
The SPA should detect Docusaurus theme on load:
```typescript
// rule-builder/src/hooks/useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    // Check Docusaurus preference from localStorage
    const stored = localStorage.getItem('theme');
    if (stored) {
      setTheme(stored as 'light' | 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    
    // Listen for changes
    const observer = new MutationObserver(() => {
      const html = document.documentElement;
      setTheme(html.getAttribute('data-theme') as 'light' | 'dark' || 'dark');
    });
    
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  
  return theme;
}
```

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Manually verify navbar link appears
- Verify build output structure is correct
- Test dark/light mode toggle
- Verify GitHub Pages routing works locally with `serve build`
- Check documentation page renders correctly
- Defer comprehensive testing to Subtask 11

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
