module.exports = {
  docs: [
    'intro',
    'getting-started',
    'key-concepts',
    {
      type: 'category',
      label: 'VSCode Extension',
      items: [
        'vscode-extension/overview',
        'vscode-extension/installation',
        'vscode-extension/features',
        'vscode-extension/development',
      ],
    },
    {
      type: 'category',
      label: 'Packages',
      items: [
        'packages/core',
      ],
    },
    {
      type: 'category',
      label: 'Core Features',
      items: [
        'archetypes',
        'rules',
        'operators',
        'facts',
        'exemptions',
        'openai-integration',
        'library-migration-tracking',
        'notifications',
      ],
    },
    {
      type: 'category',
      label: 'Rule Creation',
      items: [
        'rules/hello-rule',
        'rules/rules-cookbook',
        'rules/rule-builder-guide',
        'rules/rule-builder-templates',
      ],
    },
    {
      type: 'category',
      label: 'Configuration',
      items: [
        'local-config',
        'remote-config',
        'xfi-config',
        'environment-variables',
      ],
    },
    {
      type: 'category',
      label: 'Server',
      items: [
        'config-server',
        'docker-deployment',
        'github-webhooks',
        'telemetry',
      ],
    },
    {
      type: 'category',
      label: 'Extending',
      items: [
        'plugins/overview',
        'plugins/creating-plugins',
        'plugins/plugin-examples',
        'plugins/best-practices',
        'plugins/xfi-plugin-extract-values',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD Integration',
      items: [
        'ci-cd/overview',
        'ci-cd/github-actions',
        'ci-cd/gitlab-ci',
        'ci-cd/jenkins',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/migration-dashboard',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing',
        'contributing/building-with-cursor',
      ],
    },
  ],
};
