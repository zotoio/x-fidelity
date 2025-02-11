import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'x-fidelity',
  tagline: 'cli for opinionated framework adherence checks',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://zotoio.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/x-fidelity/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'zotoio', // Usually your GitHub org/user name.
  projectName: 'x-fidelity', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
 
      // Options
      {
        entryPoints: ['../src/index.ts'],
        tsconfig: '../tsconfig.json',
        basePath: 'api',
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          //sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/x-fi.jpg',
    navbar: {
      title: 'x-fidelity',
      logo: {
        alt: 'x-fidelity',
        src: 'img/logo.svg',
      },
      items: [
        {                                                                                                                                
          to: '/docs/api/',                                                                                                              
          label: 'API Docs',                                                                                                             
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
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
      ],
      //copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
