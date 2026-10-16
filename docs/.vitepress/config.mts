import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'promql-validator',
  description: 'PromQL editor and validator for React, Monaco and CodeMirror: highlighting, validation, quick fixes and context-aware autocomplete.',
  base: '/promql-validator/',
  cleanUrls: true,
  lastUpdated: true,

  // docs/README.md links to ../examples for GitHub browsing; that's outside the site.
  // Dead links inside docs/ are still reported.
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
          { text: 'Versioning & Releases', link: '/versioning' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'GitHub', link: 'https://github.com/Ankitsharma991/promql-validator' },
          { text: 'npm', link: 'https://www.npmjs.com/package/promql-validator' },
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
        text: 'Guides',
        items: [
          { text: 'Editor Component', link: '/editor-component' },
          { text: 'Validation', link: '/validation' },
          { text: 'PromQL Support', link: '/syntax-support' },
          { text: 'Dynamic Suggestions', link: '/dynamic-suggestions' },
          { text: 'Async Providers', link: '/async-providers' },
          { text: 'Plugins', link: '/plugins' },
          { text: 'Formatting', link: '/formatting' },
          { text: 'Theming', link: '/theming' },
          { text: 'Internationalisation', link: '/i18n' },
          { text: 'Telemetry Hooks', link: '/telemetry' },
        ],
      },
      {
        text: 'Integrations',
        items: [
          { text: 'Monaco Editor', link: '/monaco' },
          { text: 'CodeMirror 6', link: '/codemirror' },
          { text: 'CLI', link: '/cli' },
          { text: 'MetricsQL', link: '/metricsql' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Diagnostic Codes', link: '/diagnostic-codes' },
          { text: 'Performance', link: '/performance' },
          { text: 'Accessibility', link: '/accessibility' },
          { text: 'Security & Privacy', link: '/security-privacy' },
        ],
      },
      {
        text: 'Project',
        items: [
          { text: 'Architecture', link: '/architecture' },
          { text: 'Compatibility & Support', link: '/compatibility' },
          { text: 'Versioning & Releases', link: '/versioning' },
          { text: 'Roadmap', link: '/roadmap' },
          { text: 'Troubleshooting', link: '/troubleshooting' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Ankitsharma991/promql-validator' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/promql-validator' },
    ],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/Ankitsharma991/promql-validator/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Ankit Sharma',
    },
  },
});
