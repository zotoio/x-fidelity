# Topic: Package Structure And Dependencies

## Fact: Workspace Packages And Nohoist Rules
### Modified: 2026-01-29
### Priority: M

The monorepo is defined as a Yarn workspace with explicit package paths for the CLI, core engine, plugins, server, VSCode extension, shared types, and supporting config/fixtures. The workspace also uses `nohoist` for VSCode and fixtures to keep their dependency trees self-contained.

### References
1. [Workspace definition](../../package.json)

---

## Fact: Core Package Dependency Graph
### Modified: 2026-01-29
### Priority: H

The dependency chain is anchored by `@x-fidelity/types`, which is consumed by the core engine. Plugins depend on both core and types, while the CLI and VSCode extension depend on core, plugins, and types. The server package also depends on core, plugins, and types to host configuration services.

### References
1. [Types package dependencies](../../packages/x-fidelity-types/package.json)
2. [Core package dependencies](../../packages/x-fidelity-core/package.json)
3. [Plugins package dependencies](../../packages/x-fidelity-plugins/package.json)
4. [CLI package dependencies](../../packages/x-fidelity-cli/package.json)
5. [VSCode extension dependencies](../../packages/x-fidelity-vscode/package.json)
6. [Server package dependencies](../../packages/x-fidelity-server/package.json)

---

## Fact: Build Order Is Driven By Turbo Pipeline
### Modified: 2026-01-29
### Priority: H

Workspace builds are orchestrated by Turbo. The root `build` script runs `turbo build`, and the Turbo pipeline declares `build` tasks that depend on `^build`, ensuring packages build in dependency order before downstream packages.

### References
1. [Root build script](../../package.json)
2. [Turbo build task dependencies](../../turbo.json)

---

## Fact: Package Entry Points And CLI Binary
### Modified: 2026-01-29
### Priority: M

Each package exposes its runtime entry via `main`/`types` fields, while the CLI also defines a `bin` entry for the `xfidelity` executable. The VSCode extension entry point is `./dist/extension.js`, which is the activation target for the extension runtime.

### References
1. [Types package entry points](../../packages/x-fidelity-types/package.json)
2. [Core package entry points](../../packages/x-fidelity-core/package.json)
3. [CLI package bin and entry points](../../packages/x-fidelity-cli/package.json)
4. [VSCode extension entry point](../../packages/x-fidelity-vscode/package.json)

---
