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
          href: 'https://github.com/zotoio/x-fidelity',
          label: 'GitHub',
          position: 'right',
        }
      ],
    },
    footer: {
      style: 'dark',
      
      copyright: `Copyright © ${new Date().getFullYear()} x-fidelity. Built with Docusaurus.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  },
};
