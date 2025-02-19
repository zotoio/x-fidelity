module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Introduction',
      items: ['intro', 'getting-started', 'key-concepts'],
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
      type: 'doc',
      id: 'contributing',
    },
  ],
};
