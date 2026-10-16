import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'promql-validator',
  description: 'PromQL validation, context-aware autocomplete, and a themeable editor component.',
  base: '/promql-validator/',
  cleanUrls: true,
  lastUpdated: true,

  // docs/README.md intentionally links out to ../examples and the package READMEs
  // (packages/meta, monaco, codemirror) for GitHub browsing — those live outside
  // docs/ (the VitePress srcDir) and are not part of the built site, so they're
  // unresolvable to the site build itself. Real dead links *within* docs/ are
  // still caught since this only ignores paths that escape the docs root.
  ignoreDeadLinks: [/\.\.\//],

  head: [['link', { rel: 'icon', href: '/promql-validator/favicon.svg' }]],

  themeConfig: {
    logo: '/favicon.svg',

    nav: [
      { text: 'Guide', link: '/quick-start' },
      { text: 'Editor Component', link: '/editor-component' },
      { text: 'Diagnostic Codes', link: '/diagnostic-codes' },
      {
        text: 'v0.1.0',
        items: [
          { text: 'Versioning & Migration', link: '/versioning' },
          { text: 'GitHub', link: 'https://github.com/promql-validator/promql-validator' },
          { text: 'npm', link: 'https://www.npmjs.com/package/@promql-validator/core' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Installation', link: '/installation' },
          { text: 'Quick Start', link: '/quick-start' },
        ],
      },
      {
        text: 'Core Concepts',
        items: [
          { text: 'Validation', link: '/validation' },
          { text: 'Editor Component', link: '/editor-component' },
          { text: 'Dynamic Suggestions', link: '/dynamic-suggestions' },
          { text: 'Async Providers', link: '/async-providers' },
          { text: 'Formatting', link: '/formatting' },
          { text: 'Theming', link: '/theming' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Diagnostic Codes', link: '/diagnostic-codes' },
          { text: 'MetricsQL (VictoriaMetrics)', link: '/metricsql' },
          { text: 'Performance', link: '/performance' },
          { text: 'Accessibility', link: '/accessibility' },
          { text: 'Security & Privacy', link: '/security-privacy' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Versioning & Migration', link: '/versioning' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/promql-validator/promql-validator' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@promql-validator/core' },
    ],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/promql-validator/promql-validator/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © promql-validator contributors',
    },
  },
});
