---
sidebar_position: 1
---

# Hello Plugin

Scaffold a minimal plugin with one fact and one operator.

## 1. Project structure

```
my-plugin/
├─ src/
│  ├─ facts/myFact.ts
│  ├─ operators/myOperator.ts
│  └─ index.ts
├─ package.json
├─ tsconfig.json
└─ jest.config.js
```

## 2. Implement a fact

```ts
// src/facts/myFact.ts
import { FactDefn } from '@x-fidelity/types';

export const myFact: FactDefn = {
  name: 'myFact',
  description: 'Returns a sample value',
  type: 'global-function',
  priority: 3,
  fn: async () => ({ value: 'hello' })
};
```

## 3. Implement an operator

```ts
// src/operators/myOperator.ts
import { OperatorDefn } from '@x-fidelity/types';

export const myOperator: OperatorDefn = {
  name: 'myOperator',
  fn: (factValue: any, expected: any) => factValue?.value === expected
};
```

## 4. Export plugin

```ts
// src/index.ts
import { XFiPlugin } from '@x-fidelity/types';
import { myFact } from './facts/myFact';
import { myOperator } from './operators/myOperator';

const plugin: XFiPlugin = {
  name: 'xfi-my-plugin',
  version: '1.0.0',
  facts: [myFact],
  operators: [myOperator]
};

export default plugin;
```

## 5. Use the plugin

```bash
# Install (local or global)
yarn add xfi-my-plugin

# Run with plugin enabled
xfidelity . -e xfi-my-plugin
```

## 6. Next

- See the [Plugins Overview](./overview)
- Browse the [Rules Cookbook](../rules/rules-cookbook)
- Review built-in facts/operators to model your own
