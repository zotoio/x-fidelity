import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/quickstart">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Framework Adherence Checker`}
      description="Advanced framework adherence checker for maintaining code quality and consistency">
      <HomepageHeader />
      <main>
        <div className="container margin-vert--lg text--center">
          <img src="img/x-fi.png" alt="x-fidelity Logo" className={styles.homepageLogo} />
          <div className="row">
            <div className="col col--8 col--offset-2">
              <h2>What is x-fidelity?</h2>
              <p>
                x-fidelity is an advanced CLI tool and paired config server designed to perform 
                opinionated framework adherence checks within a codebase. It helps teams maintain 
                code quality and consistency by:
              </p>
              <ul className={styles.featureList}>
                <li>Enforcing custom coding standards and best practices</li>
                <li>Ensuring consistent project structure across repositories</li>
                <li>Maintaining up-to-date dependencies</li>
                <li>Catching potential issues early in development</li>
                <li>Integrating AI-powered code analysis (optional)</li>
              </ul>
            </div>
          </div>
        </div>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
