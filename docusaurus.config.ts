import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Better Docs',
  tagline: 'Documentation for the better-route and better-data WordPress PHP libraries',
  favicon: 'img/better-route-favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://lonsdale201.github.io',
  baseUrl: '/better-docs/',

  organizationName: 'Lonsdale201',
  projectName: 'better-docs',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Lonsdale201/better-docs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/Lonsdale201/better-docs/tree/main/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/better-docs-social.webp',
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Better Docs',
      logo: {
        alt: 'Better Docs Logo',
        src: 'img/better-route-logo.webp',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'betterRouteSidebar',
          position: 'left',
          label: 'better-route',
        },
        {
          type: 'docSidebar',
          sidebarId: 'betterDataSidebar',
          position: 'left',
          label: 'better-data',
        },
        {
          type: 'docSidebar',
          sidebarId: 'compositionSidebar',
          position: 'left',
          label: 'Composition',
        },
        {
          type: 'dropdown',
          label: 'GitHub',
          position: 'right',
          items: [
            {
              label: 'better-route',
              href: 'https://github.com/Lonsdale201/better-route',
            },
            {
              label: 'better-data',
              href: 'https://github.com/Lonsdale201/better-data',
            },
            {
              label: 'better-docs (this site)',
              href: 'https://github.com/Lonsdale201/better-docs',
            },
          ],
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'better-route',
          items: [
            {label: 'Documentation', to: '/docs/better-route/intro'},
            {label: 'GitHub', href: 'https://github.com/Lonsdale201/better-route'},
          ],
        },
        {
          title: 'better-data',
          items: [
            {label: 'Documentation', to: '/docs/better-data/intro'},
            {label: 'GitHub', href: 'https://github.com/Lonsdale201/better-data'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Composition', to: '/docs/composition/overview'},
            {label: 'better-docs repo', href: 'https://github.com/Lonsdale201/better-docs'},
          ],
        },
      ],
      copyright: `Copyright (c) ${new Date().getFullYear()} Soczó Kristóf. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.nightOwlLight,
      darkTheme: prismThemes.nightOwl,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
