import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const betterRouteLinks = [
  {label: 'Introduction', to: '/docs/better-route/intro'},
  {label: 'Installation', to: '/docs/better-route/getting-started/installation'},
  {label: 'Router API', to: '/docs/better-route/reference/router-api'},
  {label: 'OpenAPI', to: '/docs/better-route/openapi/overview'},
  {label: 'Release v0.3.0', to: '/docs/better-route/release-notes/v0.3.0'},
];

const betterDataLinks = [
  {label: 'Introduction', to: '/docs/better-data/intro'},
  {label: 'Installation', to: '/docs/better-data/getting-started/installation'},
  {label: 'DataObject', to: '/docs/better-data/core/data-object'},
  {label: 'Sources', to: '/docs/better-data/sources/overview'},
  {label: 'Release v1.0.0', to: '/docs/better-data/release-notes/v1.0.0'},
];

const compositionLinks = [
  {label: 'Overview', to: '/docs/composition/overview'},
  {label: 'BetterRouteBridge', to: '/docs/composition/better-route-bridge'},
  {label: 'OpenAPI together', to: '/docs/composition/openapi-with-both'},
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="better-docs"
      description="Documentation for the better-route and better-data WordPress PHP libraries.">
      <header className={styles.hero}>
        <div className="container">
          <p className={styles.kicker}>better-route v0.3.0 · better-data v1.0.0</p>
          <Heading as="h1" className={styles.title}>
            Better Docs
          </Heading>
          <p className={styles.subtitle}>
            Two complementary WordPress PHP libraries — contract-first REST routing and
            typed DTOs with security primitives. Use either alone, or compose them via the
            BetterRouteBridge.
          </p>
          <div className={styles.ctaRow}>
            <Link className="button button--primary button--lg" to="/docs/better-route/intro">
              better-route
            </Link>
            <Link className="button button--primary button--lg" to="/docs/better-data/intro">
              better-data
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/composition/overview">
              Composition
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <section className="container">
          <Heading as="h2">better-route</Heading>
          <p>
            Composer-first WordPress REST contract layer — fluent router, middleware
            pipeline, Resource DSL for CPTs and custom tables, full WooCommerce integration,
            OpenAPI 3.1 export.
          </p>
          <div className={styles.grid}>
            {betterRouteLinks.map((item) => (
              <Link key={item.to} className={styles.card} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="container">
          <Heading as="h2">better-data</Heading>
          <p>
            PHP 8.3+ DTO and Presenter library — typed immutable data hydrated from posts,
            users, terms, options, custom rows, and REST requests; symmetric write sinks;
            context-aware presentation; Secret / #[Sensitive] / AES-256-GCM #[Encrypted].
          </p>
          <div className={styles.grid}>
            {betterDataLinks.map((item) => (
              <Link key={item.to} className={styles.card} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="container">
          <Heading as="h2">Composition</Heading>
          <p>
            DTO-driven REST endpoints with auto-generated OpenAPI schemas — the
            BetterRouteBridge wires better-data DTOs into a better-route Router.
          </p>
          <div className={styles.grid}>
            {compositionLinks.map((item) => (
              <Link key={item.to} className={styles.card} to={item.to}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
