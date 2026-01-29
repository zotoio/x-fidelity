import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: React.ReactNode;
  link?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    description: (
      <>
        X-Fidelity was designed from the ground up to be easily installed and
        used to get your project up and running quickly.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    description: (
      <>
        X-Fidelity lets you focus on your code, while we&apos;ll do the chores. Go
        ahead and move your project forward.
      </>
    ),
  },
  {
    title: 'Powered by TypeScript',
    description: (
      <>
        Extend or customize your project&apos;s setup through TypeScript. X-Fidelity can
        be extended while maintaining type-safety.
      </>
    ),
  },
  {
    title: 'Rule Builder GUI',
    description: (
      <>
        Create analysis rules visually with our interactive Rule Builder.
        No JSON knowledge required.
      </>
    ),
    link: 'https://zotoio.github.io/x-fidelity/rule-builder/',
  },
];

function Feature({title, description, link}: FeatureItem) {
  const isExternal = link?.startsWith('http');
  return (
    <div className={clsx('col col--3')}>
      <div className="text--center padding-horiz--md padding-vert--md">
        <h3>
          {link ? (
            isExternal ? (
              <a href={link}>{title}</a>
            ) : (
              <Link to={link}>{title}</Link>
            )
          ) : (
            title
          )}
        </h3>
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
