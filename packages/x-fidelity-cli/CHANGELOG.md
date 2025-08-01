# Changelog

All notable changes to the X-Fidelity CLI will be documented in this file.

## [5.2.1](https://github.com/zotoio/x-fidelity/compare/v5.2.0...v5.2.1) (2025-08-01)

### Bug Fixes

* **ci:** resolve semantic-release version verification in VSCode extension workflow ([1be83a1](https://github.com/zotoio/x-fidelity/commit/1be83a102b9194797e88fdd4d5733ce5f9a6232c))

## [5.2.0](https://github.com/zotoio/x-fidelity/compare/v5.1.3...v5.2.0) (2025-08-01)

### ⚠ BREAKING CHANGES

* **ci:** Release workflow now uses direct file system operations instead of npm registry downloads for CLI embedding, significantly improving reliability and speed

### Features

* **ci:** improve CLI embedding with direct artifact copy and enhanced diagnostics ([f406895](https://github.com/zotoio/x-fidelity/commit/f40689589c600d0a0aa8e92bcb295d639b28dabf))

## [5.1.3](https://github.com/zotoio/x-fidelity/compare/v5.1.2...v5.1.3) (2025-08-01)

### Bug Fixes

* **release:** ensure latest CLI version embedded in VSCode extension during release ([6c0b06a](https://github.com/zotoio/x-fidelity/commit/6c0b06a59659dba13677af0a3309bda4d5337f6c))

## [5.1.2](https://github.com/zotoio/x-fidelity/compare/v5.1.1...v5.1.2) (2025-07-31)

### Bug Fixes

* **release:** move semantic-release config to CLI package.json ([9b6a30c](https://github.com/zotoio/x-fidelity/commit/9b6a30cbf4ca6f45b75747280f2cd8992b124a49))
* **vscode:** add missing gitHubConfigCacheManager.ts file to repository ([367531e](https://github.com/zotoio/x-fidelity/commit/367531e4d832fd7872f52aa23eb9b7359c84508d))
* **vscode:** ensure TypeScript dependencies are built before type checking ([f4863df](https://github.com/zotoio/x-fidelity/commit/f4863dfd88c2b4fd74945e7d1ad18f744b442f2c))
* **vscode:** resolve CI TypeScript compilation race condition ([3225be8](https://github.com/zotoio/x-fidelity/commit/3225be8741d05c70c7cac22f4a36a8e7cd0bfc94))
* **vscode:** resolve macOS yarn PATH issue when launched from Finder/Dock ([a9d7d4b](https://github.com/zotoio/x-fidelity/commit/a9d7d4b3619a199724c2651b24721ca10245cbbf))
* **vscode:** resolve TypeScript module resolution issue in CI ([36c0567](https://github.com/zotoio/x-fidelity/commit/36c05676a7f4b5ca31b56f74205c240fbfcc8637))
