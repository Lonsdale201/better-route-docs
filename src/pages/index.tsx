import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const quickLinks = [
  {label: 'Installation', to: '/docs/getting-started/installation'},
  {label: 'Quick Start', to: '/docs/getting-started/quick-start'},
  {label: 'Router API', to: '/docs/reference/router-api'},
  {label: 'Resource API', to: '/docs/reference/resource-api'},
  {label: 'OpenAPI', to: '/docs/openapi/overview'},
  {label: 'Scenarios', to: '/docs/scenarios/common-scenarios'},
];

export default function Home(): ReactNode {
  return (
    <Layout
      title="better-route docs"
      description="Professional documentation for the better-route WordPress REST contract library.">
      <header className={styles.hero}>
        <div className="container">
          <p className={styles.kicker}>v0.1 baseline documentation</p>
          <Heading as="h1" className={styles.title}>
            better-route
          </Heading>
          <p className={styles.subtitle}>
            Contract-first WordPress REST routing with middleware, resource DSL, and OpenAPI-ready metadata.
          </p>
          <div className={styles.ctaRow}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Read Documentation
            </Link>
            <Link className="button button--secondary button--lg" to="https://github.com/Lonsdale201/better-route">
              GitHub Repository
            </Link>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <section className="container">
          <Heading as="h2">Quick navigation</Heading>
          <div className={styles.grid}>
            {quickLinks.map((item) => (
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
