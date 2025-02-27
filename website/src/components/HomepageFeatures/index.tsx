import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Flexible Archetype System',
    description: (
      <>
        Define custom project archetypes with specific rules, configurations, and standards. 
        Ensure consistency across your entire codebase.
      </>
    ),
  },
  {
    title: 'Powerful Plugin System',
    description: (
      <>
        Extend functionality with custom plugins. Add new facts, operators, and validation rules. 
        Integrate with external services and APIs.
      </>
    ),
  },
  {
    title: 'AI-Powered Analysis',
    description: (
      <>
        Leverage OpenAI integration for advanced code analysis. Get intelligent suggestions 
        and identify potential issues early.
      </>
    ),
  },
  {
    title: 'Library Migration Tracking',
    description: (
      <>
        Track adoption of new APIs and deprecation of legacy code. Measure migration progress 
        with statistical analysis and visualize adoption rates across teams.
      </>
    ),
  },
  {
    title: 'Comprehensive Validation',
    description: (
      <>
        Check dependencies, directory structures, and code patterns. Ensure your projects 
        follow best practices and standards.
      </>
    ),
  },
  {
    title: 'CI/CD Integration',
    description: (
      <>
        Seamlessly integrate with your CI/CD pipelines. Automate checks and maintain 
        code quality throughout development.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md padding-vert--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
