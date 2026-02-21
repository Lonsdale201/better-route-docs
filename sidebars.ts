import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/quick-start'],
    },
    {
      type: 'category',
      label: 'Core',
      items: ['core/router', 'core/middleware-pipeline', 'core/request-response-and-errors'],
    },
    {
      type: 'category',
      label: 'Resources',
      items: [
        'resources/overview',
        'resources/cpt-resource',
        'resources/table-resource',
        'resources/query-contract',
      ],
    },
    {
      type: 'category',
      label: 'Auth',
      items: ['auth/overview', 'auth/jwt-bearer', 'auth/cookie-nonce', 'auth/application-password'],
    },
    {
      type: 'category',
      label: 'Write Safety',
      items: ['write-safety/idempotency', 'write-safety/optimistic-locking'],
    },
    {
      type: 'category',
      label: 'Observability',
      items: ['observability/audit', 'observability/metrics'],
    },
    {
      type: 'category',
      label: 'OpenAPI',
      items: ['openapi/overview', 'openapi/exporter', 'openapi/openapi-endpoint'],
    },
    {
      type: 'category',
      label: 'Scenarios',
      items: ['scenarios/common-scenarios'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/entry-points',
        'reference/router-api',
        'reference/resource-api',
        'reference/middleware-catalog',
        'reference/error-codes',
        'reference/faq',
      ],
    },
  ],
};

export default sidebars;
