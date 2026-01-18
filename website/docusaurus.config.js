module.exports = {
  title: 'x-fidelity',
  tagline: 'Advanced Framework Adherence Checker',
  url: 'https://zotoio.github.io',
  baseUrl: '/x-fidelity/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/x-fi.png',
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
          remarkPlugins: [[require('remark-mermaid'), {}]],
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  
  markdown: {
    mermaid: true,
  },
  
  themes: ['@docusaurus/theme-mermaid'],

  plugins: [],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'x-fidelity',
      logo: {
        alt: 'x-fidelity Logo',
        src: 'img/x-fi.png',
        srcDark: 'img/x-fi.png',
      },
      items: [
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
        {
          href: '/x-fidelity/rule-builder/',
          position: 'left',
          label: 'Rule Builder',
          className: 'navbar-rule-builder',
        },
        {
          href: 'https://github.com/zotoio/x-fidelity',
          label: 'GitHub',
          position: 'right',
        }
      ],
    },
    footer: {
      style: 'dark',
      
      copyright: `Copyright © ${new Date().getFullYear()} x-fidelity. Built with Docusaurus, https://aider.chat, https://cursor.sh`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  },
};
