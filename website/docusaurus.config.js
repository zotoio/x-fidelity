module.exports = {
  title: 'x-fidelity',
  tagline: 'Advanced Framework Adherence Checker',
  url: 'https://zotoio.github.io',
  baseUrl: '/x-fidelity/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'zotoio',
  projectName: 'x-fidelity',
  trailingSlash: false,

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/zotoio/x-fidelity/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/zotoio/x-fidelity/edit/main/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../src/types/typeDefs.ts'],
        tsconfig: '../tsconfig.json',
        out: 'api',
        sidebar: {
          fullNames: true,
          position: 0,
          fullInheritance: true
        }
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'x-fidelity',
      logo: {
        alt: 'x-fidelity Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/api',
          label: 'API',
          position: 'left'
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left'
        },
        {
          href: 'https://github.com/zotoio/x-fidelity',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'Configuration',
              to: '/docs/configuration',
            },
            {
              label: 'Plugins',
              to: '/docs/plugins',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/zotoio/x-fidelity/discussions',
            },
            {
              label: 'Issues',
              href: 'https://github.com/zotoio/x-fidelity/issues',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} x-fidelity. Built with Docusaurus.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  },
};
