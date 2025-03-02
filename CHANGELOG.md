# [3.9.0](https://github.com/zotoio/x-fidelity/compare/v3.8.1...v3.9.0) (2025-03-02)


### Bug Fixes

* add optional chaining for rule name access in analyzer ([d0c4b02](https://github.com/zotoio/x-fidelity/commit/d0c4b02c83bf77cade8e7310fe14ad0b10dd00c1))
* add type assertion to resolve schema type compatibility issue ([76f7618](https://github.com/zotoio/x-fidelity/commit/76f761869a85d09eb18a047010e6409475c766fc))
* **demo:** minor logic and test fix ([3b03804](https://github.com/zotoio/x-fidelity/commit/3b0380465dcc75355941f5e1818187f9b448ef6c))
* register plugin facts and operators before loading custom rules ([5ab7667](https://github.com/zotoio/x-fidelity/commit/5ab76675c7387a78bb43cb8bd959362a89e16ae9))
* resolve TypeScript error by casting rule to any type ([eba8fd1](https://github.com/zotoio/x-fidelity/commit/eba8fd1b968d64ec867ebeca76a92a2764321a08))
* resolve TypeScript errors in schema validation and rule handling ([8f3dd6f](https://github.com/zotoio/x-fidelity/commit/8f3dd6ffca0956a30a4b17794e1b2e0cdee178c0))
* update custom rule filename and enhance fact almanac handling ([8d11d55](https://github.com/zotoio/x-fidelity/commit/8d11d55c930e4389185905449dc6561958386317))


### Features

* Add custom rule configuration with example plugin and operators ([7e54510](https://github.com/zotoio/x-fidelity/commit/7e54510d9ef25249d70f3e4691f9aae203bf2489))
* add support for custom rules and plugins in .xfi-config.json ([6206802](https://github.com/zotoio/x-fidelity/commit/62068028636b2da1a7f25df503be6bbb7c8dfdb3))

## [3.8.1](https://github.com/zotoio/x-fidelity/compare/v3.8.0...v3.8.1) (2025-03-02)


### Bug Fixes

* **commitzen:** fix glob compatibilty issue ([73a7058](https://github.com/zotoio/x-fidelity/commit/73a7058e82d5853ceff3d3e5e3e48a03180f077d))

# [3.8.0](https://github.com/zotoio/x-fidelity/compare/v3.7.1...v3.8.0) (2025-03-02)


### Features

* enhance error logging with file context and flush logs before exit ([ebdffb4](https://github.com/zotoio/x-fidelity/commit/ebdffb475b6529355660949092bb9e045ad359a3))


### Performance Improvements

* **analysis:** fix performance issue for very large codebases ([067ab7e](https://github.com/zotoio/x-fidelity/commit/067ab7e5d10fc1c45d44bb936f808e477ed85303))

## [3.7.1](https://github.com/zotoio/x-fidelity/compare/v3.7.0...v3.7.1) (2025-03-01)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([b21eab3](https://github.com/zotoio/x-fidelity/commit/b21eab312ec803f4a9f9fb078ece0a21a5b6b610))

# [3.7.0](https://github.com/zotoio/x-fidelity/compare/v3.6.0...v3.7.0) (2025-02-27)


### Features

* **file scope:** example of checking new react feature adoption ([c3b58ba](https://github.com/zotoio/x-fidelity/commit/c3b58ba887bc36182bc6ff7646e76256e301425a))

# [3.6.0](https://github.com/zotoio/x-fidelity/compare/v3.5.0...v3.6.0) (2025-02-27)


### Bug Fixes

* add type annotations to fix TypeScript errors in globalFileAnalysis ([588c814](https://github.com/zotoio/x-fidelity/commit/588c8140a348a4959e62c027bdadbd625a11dc51))


### Features

* add global file analysis with pattern matching and ratio operators ([ab456df](https://github.com/zotoio/x-fidelity/commit/ab456df857efa82fd4f394f474b0b6f85b1fc91e))
* add support for new and legacy pattern analysis ([6702ea0](https://github.com/zotoio/x-fidelity/commit/6702ea081cff3fbc2abceed35e4aee073ff02b56))
* **targeting:** facts and operators to support rules applied to specific codebase matches ([231cb9a](https://github.com/zotoio/x-fidelity/commit/231cb9adedac8dc18666058925af835b68fe60e3))

# [3.5.0](https://github.com/zotoio/x-fidelity/compare/v3.4.0...v3.5.0) (2025-02-27)


### Bug Fixes

* **regexmatch:** give better examples of iterative and negative matches ([3a4f211](https://github.com/zotoio/x-fidelity/commit/3a4f21157119a0677b29ebc211716526d8a762d0))


### Features

* add plugin support to archetype configuration ([9e0a02b](https://github.com/zotoio/x-fidelity/commit/9e0a02be24fb812ca056157a0c3f1c7b8699b7f2))

# [3.4.0](https://github.com/zotoio/x-fidelity/compare/v3.3.1...v3.4.0) (2025-02-26)


### Bug Fixes

* add support for all modern regex flags in pattern matching ([847a320](https://github.com/zotoio/x-fidelity/commit/847a32068b68db66c1a9d84090bae4bc918f36d0))
* correct regex test case to use case-insensitive flag ([96d906c](https://github.com/zotoio/x-fidelity/commit/96d906c23833f482d649df866ca36f28f609bbd6))


### Features

* add regex pattern matching operator with tests ([8ac216f](https://github.com/zotoio/x-fidelity/commit/8ac216f222a28367eba971f0f187fad4173167b3))
* **operators:** add regexMatch general purpose operator ([8270696](https://github.com/zotoio/x-fidelity/commit/82706966e9a52c089848f785007f415e614b67da))

## [3.3.1](https://github.com/zotoio/x-fidelity/compare/v3.3.0...v3.3.1) (2025-02-26)


### Bug Fixes

* **engine:** node 18 ([6c3e157](https://github.com/zotoio/x-fidelity/commit/6c3e157d0873dbd6148c568f213ee7ad997744bd))

# [3.3.0](https://github.com/zotoio/x-fidelity/compare/v3.2.0...v3.3.0) (2025-02-22)


### Bug Fixes

* add required compareValue parameter to missingRequiredFiles operator ([65ea1b6](https://github.com/zotoio/x-fidelity/commit/65ea1b6ad93f50357eeb17929d52d1b3ee7c39cc))


### Features

* add missingRequiredFiles operator to plugin and update rule ([c9a8f79](https://github.com/zotoio/x-fidelity/commit/c9a8f79bc9d2d5db61f953ca22563442c276b659))
* add required files plugin with configurable path checks ([3561c04](https://github.com/zotoio/x-fidelity/commit/3561c04a90add046c18b9a1e998dc94c24776ed0))
* Enhance missingRequiredFiles operator with path validation and logging ([962cf38](https://github.com/zotoio/x-fidelity/commit/962cf387bcd8dfbb16d62ec842d11153602b967c))

# [3.2.0](https://github.com/zotoio/x-fidelity/compare/v3.1.1...v3.2.0) (2025-02-20)


### Bug Fixes

* **docs:** release ([633d0ff](https://github.com/zotoio/x-fidelity/commit/633d0ff966aabc4a433929cbd1cb4e66843b8450))


### Features

* set dark mode as default theme with color mode preferences ([ed6d6ec](https://github.com/zotoio/x-fidelity/commit/ed6d6ece77acf56acf36aaafe4ee0eeb2e043107))

## [3.1.1](https://github.com/zotoio/x-fidelity/compare/v3.1.0...v3.1.1) (2025-02-20)


### Bug Fixes

* add getting-started link to navbar with correct path ([48300a7](https://github.com/zotoio/x-fidelity/commit/48300a7e78f454fdc24d6d9013eff0bd22d9fc86))
* docgen fix ([6e657fb](https://github.com/zotoio/x-fidelity/commit/6e657fbbb8b98013c1ce479c365ed7d205a88d57))
* update broken documentation links and sidebar structure ([e8a83ae](https://github.com/zotoio/x-fidelity/commit/e8a83ae12ee17fa74533df254dcb6908c462c52b))
* update navbar link to point to intro page instead of getting-started ([a0b997e](https://github.com/zotoio/x-fidelity/commit/a0b997ecce49d66a57860a9f081dd65d9bc91bfb))

# [3.1.0](https://github.com/zotoio/x-fidelity/compare/v3.0.4...v3.1.0) (2025-02-20)


### Bug Fixes

* add missing typedoc dependency for documentation generation ([1152c4d](https://github.com/zotoio/x-fidelity/commit/1152c4d71829ea642dd68d671102433bc9e0ce03))
* correct broken documentation links ([b48b474](https://github.com/zotoio/x-fidelity/commit/b48b47406fac82ac5f6f0775927b1b99cbdd5d5f))
* correct broken documentation links in website files ([ed17172](https://github.com/zotoio/x-fidelity/commit/ed171720020e610e2c27b0a953adabcc43037511))
* correct docId path in navbar configuration ([00985cc](https://github.com/zotoio/x-fidelity/commit/00985cc10cc42e0e016d4459ef3bf54931e10959))
* **docs and minor fixes:** docusaurus site beta ([935dd1f](https://github.com/zotoio/x-fidelity/commit/935dd1f2a9125ef6c9e1bda86a6401a20e87d020))
* handle null and undefined equality in customOperator ([9ed96e4](https://github.com/zotoio/x-fidelity/commit/9ed96e4ae46899943c9515e36622627f00aac32d))
* update broken documentation links and references ([8de8ecc](https://github.com/zotoio/x-fidelity/commit/8de8ecc8aea5b5e5412a34daf72c281e5f9340b4))
* update favicon path to use x-fi.png logo ([161c8f7](https://github.com/zotoio/x-fidelity/commit/161c8f786fd8139628f37165f96b7cff6b021db7))
* update prism theme import syntax for compatibility ([e6b6380](https://github.com/zotoio/x-fidelity/commit/e6b638053d55272613f6f715d4c2e87dac535b62))
* update relative paths in documentation links ([f3eca1f](https://github.com/zotoio/x-fidelity/commit/f3eca1fc1be53caeb5e506a4c8f42b372f81e1b2))
* update TypeDoc plugin configuration and dependencies ([078a799](https://github.com/zotoio/x-fidelity/commit/078a799fe283666a4c6384199f8a1b2420621604))


### Features

* add homepage features component and styles ([8a7a601](https://github.com/zotoio/x-fidelity/commit/8a7a6017834c78f52079bd0f7d471047080c0f28))
* add initial Docusaurus documentation setup ([3c553e1](https://github.com/zotoio/x-fidelity/commit/3c553e1f0b55601b5f1568bd707a621f509b9d41))
* add initial Docusaurus website configuration files ([b6c8e02](https://github.com/zotoio/x-fidelity/commit/b6c8e02cac1465cb988f67e2bb2eba3e0cb04fb0))
* add landing page with features overview and API reference link ([af8c760](https://github.com/zotoio/x-fidelity/commit/af8c760c7b04e454310cc3f43524c3987d3713b6))
* add landing page with project description and API reference link ([08c6232](https://github.com/zotoio/x-fidelity/commit/08c6232a3a45448d9fe22aabb5f23764e81b53bd))
* add Mermaid diagram support to documentation ([3894a43](https://github.com/zotoio/x-fidelity/commit/3894a438446d73d55b5d7efee2744d4452020f17))
* enhance TypeDoc plugin configuration for complete API docs ([124b845](https://github.com/zotoio/x-fidelity/commit/124b84539dc31cb5c9a8ca9d12795434d98de8d2))
* update logo display in navbar and homepage ([f880c1f](https://github.com/zotoio/x-fidelity/commit/f880c1fc3463221aa7670f110447a7391fd39a70))

## [3.0.4](https://github.com/zotoio/x-fidelity/compare/v3.0.3...v3.0.4) (2025-02-19)


### Bug Fixes

* **plugins:** ensure logger instance reused and fix entrypoint logic ([c21ad6e](https://github.com/zotoio/x-fidelity/commit/c21ad6e764e18f7910170ed970492208fe4197e8))

## [3.0.3](https://github.com/zotoio/x-fidelity/compare/v3.0.2...v3.0.3) (2025-02-18)


### Bug Fixes

* **error handling:** deal with unexpected errors globally ensuring async ops finish ([2292d4d](https://github.com/zotoio/x-fidelity/commit/2292d4d09ef75a419778d3df77381a1353217361))
* improve error handling and telemetry logging ([f7fa9ca](https://github.com/zotoio/x-fidelity/commit/f7fa9ca6b63bcf75ebab8dbc710eb78fc718cefe))
* normalize event type casing in telemetry test ([9b791f9](https://github.com/zotoio/x-fidelity/commit/9b791f969816f29efa6138b9f95235c6614a3ac7))
* standardize event type casing to lowercase in error handling ([0416cca](https://github.com/zotoio/x-fidelity/commit/0416ccae4f796ee1a3404f65545a00d67e26bbc7))

## [3.0.2](https://github.com/zotoio/x-fidelity/compare/v3.0.1...v3.0.2) (2025-02-15)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([2f5acac](https://github.com/zotoio/x-fidelity/commit/2f5acac2f3b31809af65c4287e8aa58b384a46e3))

## [3.0.1](https://github.com/zotoio/x-fidelity/compare/v3.0.0...v3.0.1) (2025-02-15)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([5dd70a3](https://github.com/zotoio/x-fidelity/commit/5dd70a3363b212d85147dbd18f56e0eaefcc1897))

# [3.0.0](https://github.com/zotoio/x-fidelity/compare/v2.17.2...v3.0.0) (2025-02-15)


### Bug Fixes

* add event listener cleanup in engine test files ([705a39c](https://github.com/zotoio/x-fidelity/commit/705a39c8357c74cc2f7935a44da1bdb27bcb9e31))
* add interceptors mock to axios test client ([edb17b5](https://github.com/zotoio/x-fidelity/commit/edb17b54a45771c53eb44dd34763d93273d137bf))
* add isPathInside imports and handle missing file paths ([42b0207](https://github.com/zotoio/x-fidelity/commit/42b0207276827cb05aa10d4b6c5c9247c33bbb6f))
* add matchLength undefined checks in maskValue function ([2872ec5](https://github.com/zotoio/x-fidelity/commit/2872ec5323e4517f032f404cf6c50237af1d5e59))
* add missing Engine interface methods in test mock ([fa523d2](https://github.com/zotoio/x-fidelity/commit/fa523d217839e997713aa8527d95bf1b968c1c0d))
* add missing ErrorLevel type import in engineRunner ([bb8551c](https://github.com/zotoio/x-fidelity/commit/bb8551c9dbfc7282e39bf871f97696e2705d7686))
* add missing imports for path and pluginRegistry ([d98192b](https://github.com/zotoio/x-fidelity/commit/d98192b4eb8b540975ab351efa5e24aaab5fabd7))
* add missing interceptors to axios mock in test ([42a72eb](https://github.com/zotoio/x-fidelity/commit/42a72eb121fd28009ebdf91383e1a93d6cae7a4b))
* add missing logger import in facts/index.ts ([46d09c7](https://github.com/zotoio/x-fidelity/commit/46d09c70120a935a15d5c5cf070b27bf3d2cf0fb))
* add missing logger.info mock in test setup ([c1a3dba](https://github.com/zotoio/x-fidelity/commit/c1a3dbaa3bb4cf1d696244d274d8aed94ec897e1))
* add missing OperatorDefn type import in pluginRegistry ([51fcf15](https://github.com/zotoio/x-fidelity/commit/51fcf159fa6bd93f0f5081aee5dd87dc0a85a10a))
* add mock implementation for path.relative in tests ([f39ce89](https://github.com/zotoio/x-fidelity/commit/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca))
* add mock implementation for path.resolve in tests ([edd3388](https://github.com/zotoio/x-fidelity/commit/edd33884f61ae2a8a457b15a32478f949b8d7d96))
* add null check for childPath in isPathInside function ([c510bd4](https://github.com/zotoio/x-fidelity/commit/c510bd43fff43328ced1d5706f0969e630b4ed19))
* add proper type annotations to express logger functions ([7146f70](https://github.com/zotoio/x-fidelity/commit/7146f70f954021708cc79924727a7cd306596ada))
* add proper type annotations to express logger middleware ([c0868ce](https://github.com/zotoio/x-fidelity/commit/c0868ceb8f2aca2dcd91da06c3977154f4b12ef1))
* add type annotation for operators object to fix string indexing ([aa3ced1](https://github.com/zotoio/x-fidelity/commit/aa3ced1b494aa3c453d3d7231ef9c99e0a2603fa))
* add type annotation for rest parameter in mock implementation ([736fd36](https://github.com/zotoio/x-fidelity/commit/736fd36f4fbe9299cbc600f6700d1603d6337659))
* add type assertion for errorSource in engineRunner ([f17df2a](https://github.com/zotoio/x-fidelity/commit/f17df2a6982c79a31520141324d64281321138a8))
* add type cast for args spread in plugin function call ([f88f3f8](https://github.com/zotoio/x-fidelity/commit/f88f3f840318cc8eb1a404d6fe30efc58d178598))
* add type cast for rule name property in validate command ([5b811ad](https://github.com/zotoio/x-fidelity/commit/5b811ad00bcf50b76a8b96999ae36a758f2a286d))
* add type safety for engine removeAllListeners method in tests ([f1bd1c0](https://github.com/zotoio/x-fidelity/commit/f1bd1c056246918303d4b4fbda2702cc8f807e79))
* avoid reassigning to constant error variable in error handling ([5f04405](https://github.com/zotoio/x-fidelity/commit/5f04405a02693c53dc048d2c63ac1cb9827c24a2))
* cast event types to ErrorLevel enum for type safety ([f2cb3b5](https://github.com/zotoio/x-fidelity/commit/f2cb3b567d4061b57c5ca6c9b07cd628f9554c5c))
* change logPrefix from const to let for mutability ([2ce6b56](https://github.com/zotoio/x-fidelity/commit/2ce6b5615a9be93230e5278dcf5b3308e4c2b5aa))
* correct Engine type definition in engineRunner test ([e474084](https://github.com/zotoio/x-fidelity/commit/e474084ca0cc033a341cc983174b66161bdf0dbe))
* correct function type signature in plugin registry ([f5001df](https://github.com/zotoio/x-fidelity/commit/f5001df187496074b7d2be517bdb714c31b495e5))
* correct type casting for spread operator in plugin function call ([55e1894](https://github.com/zotoio/x-fidelity/commit/55e1894f099d3153699613e543d0163f9a0e00e5))
* correct type signature for pino-http customLogLevel function ([8d6cb76](https://github.com/zotoio/x-fidelity/commit/8d6cb7696c32aa26fbf97bc9bf0637f1e1ae0089))
* correct TypeScript errors in logger implementation ([8da1f9c](https://github.com/zotoio/x-fidelity/commit/8da1f9ca56cf054cd499df4d2da510ba6fdb8ab0))
* correct TypeScript errors in operator and error handling ([d2a1927](https://github.com/zotoio/x-fidelity/commit/d2a19270e047a903d1ef0a526f2bd193dab5a39f))
* declare handledError variable before usage in error handling ([34a95a9](https://github.com/zotoio/x-fidelity/commit/34a95a9ca2994db0bf8d03381e636b315e75ee37))
* declare handledError with proper scope in engineRunner ([65fc6b9](https://github.com/zotoio/x-fidelity/commit/65fc6b905ead2756462ac81eb7085189d06833ec))
* ensure error handling type safety and add onError schema ([b61c183](https://github.com/zotoio/x-fidelity/commit/b61c183565a15c18c665581df806a387792878a2))
* ensure type safety in engine runner error handling ([32a3007](https://github.com/zotoio/x-fidelity/commit/32a30076a2673ecc9f32e42a3a7e876133ce8a64))
* handle missing fs.promises.stat and fix directory structure check ([84ff132](https://github.com/zotoio/x-fidelity/commit/84ff132e63dfd88255a4e38b316399ff2c82abcd))
* handle symlink errors and improve directory structure validation ([b2847c9](https://github.com/zotoio/x-fidelity/commit/b2847c96f85a04f68033371fc5235255971a5e0d))
* handle undefined paths and use path.resolve for path normalization ([e814259](https://github.com/zotoio/x-fidelity/commit/e814259eef9372d3f79a890952a685d1086bd7a0))
* improve error handling in dependency collection ([ee003d2](https://github.com/zotoio/x-fidelity/commit/ee003d23713b7fcc465ec042e605518c8fb1a34f))
* improve event listener handling and type safety in tests ([32d6c3b](https://github.com/zotoio/x-fidelity/commit/32d6c3bdf2a4148a84969e8baa5ee647cfed57c6))
* improve logger prefix handling and configuration inheritance ([42f6d8c](https://github.com/zotoio/x-fidelity/commit/42f6d8ccfdc437e51d58be690ca1cd39b023dade))
* improve operator error detection in rule execution ([3590c50](https://github.com/zotoio/x-fidelity/commit/3590c5078bdefe90fefe98279eb52402446e8e4a))
* improve plugin error handling and propagation ([82315c6](https://github.com/zotoio/x-fidelity/commit/82315c6d02c025a2a022d3b59cd61070479c954f))
* improve TypeScript types for logger and pino middleware ([77bd9ac](https://github.com/zotoio/x-fidelity/commit/77bd9acf8a42dff164623f81fdac2b977cb9ff78))
* initialize logger immediately and update test expectations ([adc8d76](https://github.com/zotoio/x-fidelity/commit/adc8d7641ba42ae4f8e56440f8bea417c2cb8568))
* move operator loading inside function to capture latest plugins ([c1df0df](https://github.com/zotoio/x-fidelity/commit/c1df0dfe602adfea05b9db86a67c1e33f9915a96))
* prevent masking of string values in maskSensitiveData util ([f9abb11](https://github.com/zotoio/x-fidelity/commit/f9abb11929aa90c619f522f985b91572e603e7e9))
* remove duplicate export statements in types/index.ts ([b61504c](https://github.com/zotoio/x-fidelity/commit/b61504ce03f5cbd4d0ff4ba8dc99645e40be7310))
* remove duplicate function declarations in logger.ts ([fe68714](https://github.com/zotoio/x-fidelity/commit/fe68714618067ee5600a5e00048632b1c265f6d2))
* remove duplicate removeAllListeners property in mock Engine object ([f77bd1a](https://github.com/zotoio/x-fidelity/commit/f77bd1a05719c8c1598fec364febe5f835f24390))
* remove duplicate setLogLevel function declaration ([a6f892a](https://github.com/zotoio/x-fidelity/commit/a6f892a0f0de31d7e564ab9984364f30b29c01ec))
* remove unused plugin types import ([47e3bdc](https://github.com/zotoio/x-fidelity/commit/47e3bdcf8d3228ba90fc6c790bd67aa18497aff6))
* rename errorSource to source in ErrorActionParams interface ([d7f2c04](https://github.com/zotoio/x-fidelity/commit/d7f2c048922bb9a285cbe73482b8a3b8d0ce4634))
* rename reqCustomProps to customProps in express logger config ([22f380e](https://github.com/zotoio/x-fidelity/commit/22f380e4d80296b248ce472796af6890d1bd8639))
* replace Function.apply with Function.call for better type safety ([f0e8e2d](https://github.com/zotoio/x-fidelity/commit/f0e8e2d2c1ef7eb0acece223474f33e08e7cd478))
* resolve logger initialization circular dependency ([3d81e87](https://github.com/zotoio/x-fidelity/commit/3d81e87fc5cabd339c5173a92ec1b66d9377671a))
* resolve TypeScript error by avoiding reassignment to constant error ([e16fbd6](https://github.com/zotoio/x-fidelity/commit/e16fbd6c57ce98a12fb1e868c0a86f2998774b34))
* resolve TypeScript errors in engineRunner test file ([26cf0a5](https://github.com/zotoio/x-fidelity/commit/26cf0a5ad1e0fefe14c6e3697bebec2017a6cc72))
* resolve TypeScript errors in logger implementation ([5025c92](https://github.com/zotoio/x-fidelity/commit/5025c92f75d9a754ef38194e4495ada9bb8b50d2))
* resolve TypeScript interface inheritance for XFiLogger ([01c9069](https://github.com/zotoio/x-fidelity/commit/01c906978a2b9e034c953646489d28148a48598d))
* **test:** delete invalid tests ([6a3e449](https://github.com/zotoio/x-fidelity/commit/6a3e449d0c8673a70efc801cefc3a565678e5ecf))
* update axios client test module imports and error handling ([944d83c](https://github.com/zotoio/x-fidelity/commit/944d83c4d74a4aa6984351ad560737d00cee3f07))
* update axios mock implementation for 429 retry test ([469881c](https://github.com/zotoio/x-fidelity/commit/469881cc17bae169115c29fcaf0d8d4949f85250))
* update customContains operator to handle file analysis result object ([961a8cf](https://github.com/zotoio/x-fidelity/commit/961a8cf66384929b2af5e9fc8f647c22803d413f))
* update docusaurus config to use correct API paths ([749b04f](https://github.com/zotoio/x-fidelity/commit/749b04f14475849294420145101445f325608e85))
* update function type signatures for plugin facts ([7aaf633](https://github.com/zotoio/x-fidelity/commit/7aaf6335ec421d0f527eb3c9f65b7e4cc8cd104e))
* update logger implementation to use Pino instead of Winston ([78fa960](https://github.com/zotoio/x-fidelity/commit/78fa960ec2e339bbe3b1bc54d3188ef313287ac0))
* update logger types and fix pino-http integration ([6dbe72e](https://github.com/zotoio/x-fidelity/commit/6dbe72ef25df54d9faf8a6d41b7069a95a84c5b9))
* update pino logger types and middleware configuration ([bf3f0bf](https://github.com/zotoio/x-fidelity/commit/bf3f0bf64d1150d5c7bba6cdf47028f20c8b6ce3))
* update spread args type to tuple for TypeScript compatibility ([cf0579b](https://github.com/zotoio/x-fidelity/commit/cf0579bcdc38007e66d639f01e846fe3c35861b1))
* use call() instead of apply() for proper argument handling ([eedc5bf](https://github.com/zotoio/x-fidelity/commit/eedc5bfe9497c67fddd051dd4b59c99e3baeedb8))


### Features

* add basic plugin example with custom operator and fact ([7af5f0f](https://github.com/zotoio/x-fidelity/commit/7af5f0fcf1cee2c02fb4c6c73999e99df0c01236))
* add custom error handling and action execution for rules ([4eb80a3](https://github.com/zotoio/x-fidelity/commit/4eb80a3d7e293588ad57fc34c26c792874f4c43f))
* add dynamic log level configuration and prefix management ([3bdf085](https://github.com/zotoio/x-fidelity/commit/3bdf08504e7b51c34d1eeef6860e7e88ce019663))
* add dynamic log level control and improve environment variable handling ([138f6d0](https://github.com/zotoio/x-fidelity/commit/138f6d0efadf5f52c9df560777be84baf63b41d9))
* add dynamic log level control and improve initialization logging ([0640350](https://github.com/zotoio/x-fidelity/commit/0640350dc947018b41028fd35453c2f1e5562bfa))
* add environment variable control for log level ([95197a5](https://github.com/zotoio/x-fidelity/commit/95197a502422052d8337f7fe96dd0de3d3aa8fed))
* add error behavior configuration for rule execution ([2380704](https://github.com/zotoio/x-fidelity/commit/2380704beb019ee72f4a054235ed6592e35f073e))
* add error count tracking to codebase analysis results ([c8e5847](https://github.com/zotoio/x-fidelity/commit/c8e5847a6fb3285769e2c3c83705bb8ffb88bd0a))
* add error demo plugin with comprehensive error handling ([336d24a](https://github.com/zotoio/x-fidelity/commit/336d24a3da91ba334951c7ced0271f19a3d6c637))
* add error handling and export utility modules ([ea41b07](https://github.com/zotoio/x-fidelity/commit/ea41b07b8f4cec57117a339ce60b2e7c147b77d2))
* add errorCount field to ResultMetadata interface ([24f8d84](https://github.com/zotoio/x-fidelity/commit/24f8d8472bcfccb69f9bcaab4e3d170c3b3e92ec))
* add ErrorLevel type for rule failure levels ([1523f9f](https://github.com/zotoio/x-fidelity/commit/1523f9fd96a6cd4f3312c171772f97cc5149bdd9))
* add explicit method signatures to XFiLogger interface ([af1684d](https://github.com/zotoio/x-fidelity/commit/af1684d1db71d0ccf2c047457239d5adba93ae12))
* add extensions file option to CLI and banner display ([3512f4f](https://github.com/zotoio/x-fidelity/commit/3512f4ffa5cde82a4500f199b8632f9436e99680))
* add external API integration with regex value extraction ([c019226](https://github.com/zotoio/x-fidelity/commit/c0192260a8ff0c6bc60afc28fc81f4ff48358c10))
* add external sample rules loading for basic plugin ([b63fb0a](https://github.com/zotoio/x-fidelity/commit/b63fb0aadda2bf9af4018267a2c672fdfe01ec87))
* add fallback to global modules for plugin loading ([52949fb](https://github.com/zotoio/x-fidelity/commit/52949fbc06d6dd9a1aefdfbf5e9086c2d83b6b5f))
* add operation field to dependency error logging ([457050b](https://github.com/zotoio/x-fidelity/commit/457050b5cbda10bdfbc22230d29569902eb6444f))
* add plugin error handling with result propagation ([8f0a78e](https://github.com/zotoio/x-fidelity/commit/8f0a78edba0b9352a7d485bc7ae87cd2b5064356))
* add plugin loading support to CLI mode ([7c23f01](https://github.com/zotoio/x-fidelity/commit/7c23f01e5ce7307391b42ae5e0f755ee6ef91d3f))
* add regex validator plugin with API validation support ([664cdb5](https://github.com/zotoio/x-fidelity/commit/664cdb595c925637042b4ce511681b012ba9ceec))
* add regex validator plugin with validation endpoint support ([0cc8b55](https://github.com/zotoio/x-fidelity/commit/0cc8b55183727c5f68c7493fff50e698df16e951))
* add routeBasePath to TypeDoc plugin for correct API docs routing ([255bbe5](https://github.com/zotoio/x-fidelity/commit/255bbe591d931b0c31877bbebaec7e32f9c4f175))
* add sample rule using customFact and customOperator ([27f864f](https://github.com/zotoio/x-fidelity/commit/27f864f196e2e3dbe49b831e3c3e739cef708a20))
* add sample rules loading to sample plugin ([c1ef6f4](https://github.com/zotoio/x-fidelity/commit/c1ef6f409a4e5e23f60c72c1e489c2f296664abe))
* add sample rules support to plugin interface ([e263728](https://github.com/zotoio/x-fidelity/commit/e263728de96835ab27188cecbb7f6729ce0d859b))
* add source map support and error location enhancement to logger ([f641a69](https://github.com/zotoio/x-fidelity/commit/f641a69f992100650ce32831cad9dd197f845914))
* add src/plugins as first lookup path for plugin loading ([bd2e8b5](https://github.com/zotoio/x-fidelity/commit/bd2e8b586a0b2402910dd301ac706247a2bb7e48))
* add subpath exports for logger and axios utilities ([21a9ff2](https://github.com/zotoio/x-fidelity/commit/21a9ff293cedfde5d9339516351f933b430d100b))
* add support for loading external plugins via extensions ([d044e02](https://github.com/zotoio/x-fidelity/commit/d044e020f727aec554ee7dcc4acd3e8bcb6a854b))
* add symlink support with cycle detection in file operations ([7862c52](https://github.com/zotoio/x-fidelity/commit/7862c526c9e5da4cba438e80d979b6a9c9b67a7b))
* add test command as default CLI action ([40ad784](https://github.com/zotoio/x-fidelity/commit/40ad7840220e37a2b901037185f09c3ed32ec260))
* add test server script for serving mock JSON responses ([e204196](https://github.com/zotoio/x-fidelity/commit/e2041960251b6f2c3e3089bc52e1b7673fd553ad))
* add validate command for archetype configuration validation ([31d489a](https://github.com/zotoio/x-fidelity/commit/31d489a2b7af6d591e257604c11449b612e7716a))
* enhance error handling with source classification and stack traces ([eaaf0e0](https://github.com/zotoio/x-fidelity/commit/eaaf0e0e3a4b85cd23a234bba12c9e3fefb48f15))
* enhance Pino logger with multistream and improved serialization ([3956a0b](https://github.com/zotoio/x-fidelity/commit/3956a0b4ac8cfd0944cc4fd3f5681694a865ffd2))
* enhance plugin loading logs with detailed facts and operators info ([96b49eb](https://github.com/zotoio/x-fidelity/commit/96b49eb69c046dfb7496bcf5d84112841a276d0c))
* enhance plugin registration with validation and module format support ([785445b](https://github.com/zotoio/x-fidelity/commit/785445b84d62b6a313a09a10dbbab223739daae1))
* enhance sensitive data protection in logging and env vars ([b7dc977](https://github.com/zotoio/x-fidelity/commit/b7dc977ebe059d760fccad9a66221042f5992a39))
* expose TypeScript type definitions in package exports ([8c0dd86](https://github.com/zotoio/x-fidelity/commit/8c0dd86ed27d86df36da1db34359a8ea2d4d6549))
* implement intermittent masking pattern for sensitive data ([18a5d84](https://github.com/zotoio/x-fidelity/commit/18a5d84ac6444897286dae472f66fadab8a766b5))
* implement partial masking for sensitive data with string support ([d8dc195](https://github.com/zotoio/x-fidelity/commit/d8dc19590710e763e8eb1e7f8002a449d5af3346))
* implement plugin system for custom facts and operators ([6a03a2c](https://github.com/zotoio/x-fidelity/commit/6a03a2c7a720ff98b85333be7c4073674b10133c))
* improve sensitive data masking to maintain original length ([b47cbca](https://github.com/zotoio/x-fidelity/commit/b47cbca1ddb772da28b23e5d58123a18e6bac709))
* integrate plugin facts into allFacts registry ([89504e4](https://github.com/zotoio/x-fidelity/commit/89504e43479af94c9121914e186d2db6e4a1d68a))
* **plugin framework:** refactor and improve extensibility ([d999ebc](https://github.com/zotoio/x-fidelity/commit/d999ebcfbf482a41d77e96393188d02cc0b2b0e2))
* support loading multiple npm modules as extensions directly ([e485c6b](https://github.com/zotoio/x-fidelity/commit/e485c6bf550547c43d5d2e9248477e16ff059d6b))
* update basic plugin to support external API calls and regex extraction ([c23941c](https://github.com/zotoio/x-fidelity/commit/c23941cc7dac4a67ada075970859e395a4369aec))
* update mask function to show 6 characters at each end ([9b8babe](https://github.com/zotoio/x-fidelity/commit/9b8babe6cfa4b41bcd3b70e476e4e23259d80a27))


### BREAKING CHANGES

* **plugin framework:** cli options extended to include -e loading plugins, and enhancements to AI
integration options

## [2.17.2](https://github.com/zotoio/x-fidelity/compare/v2.17.1...v2.17.2) (2025-01-16)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([f554ca3](https://github.com/zotoio/x-fidelity/commit/f554ca33da23f72a994ef49b7979ed71544f3d2a))

## [2.17.1](https://github.com/zotoio/x-fidelity/compare/v2.17.0...v2.17.1) (2024-12-03)


### Bug Fixes

* **docs:** include docs on new exemption dir ([feedcfa](https://github.com/zotoio/x-fidelity/commit/feedcfa4dd6ceae32910038018e282a519c2df86))

# [2.17.0](https://github.com/zotoio/x-fidelity/compare/v2.16.9...v2.17.0) (2024-12-03)


### Bug Fixes

* add missing function imports in exemptionLoader test ([f57be34](https://github.com/zotoio/x-fidelity/commit/f57be34b4ce54030f25af510c8d0fc372d9d1f8f))
* add missing localConfigPath parameter in exemption loader tests ([5e40ddf](https://github.com/zotoio/x-fidelity/commit/5e40ddfde0ec26d00ba2a568aaee5c90ca379a35))
* add readFileSync to fs mock in exemptionLoader test ([685e6c7](https://github.com/zotoio/x-fidelity/commit/685e6c73d8f1ea0d94cbebe6bd6e7d0cf6dd6c8d))
* improve exemption loading and URL normalization ([6c4db5c](https://github.com/zotoio/x-fidelity/commit/6c4db5cb2d0081fc2ecd166d0f073e31495385e6))
* improve pre-release version handling in semver comparisons ([10414a5](https://github.com/zotoio/x-fidelity/commit/10414a5645deef67ee5657f05cf9cccf62cb97c8))
* improve semver comparison for pre-release versions ([967cb03](https://github.com/zotoio/x-fidelity/commit/967cb0343c6a82c3213d3ed271148a9d9491fbd2))
* improve SSH URL normalization in GitHub URL parser ([b348b40](https://github.com/zotoio/x-fidelity/commit/b348b40d411c275088285f3f6506ca219eb44f9a))
* preserve URLs already in org/repo format in normalizeGitHubUrl ([322f89f](https://github.com/zotoio/x-fidelity/commit/322f89f0628f19917d26472b1c7ec80d12e0bca4))
* simplify SSH URL regex pattern in GitHub URL normalization ([67b0798](https://github.com/zotoio/x-fidelity/commit/67b0798fc76092e20cd2e1aee2dfe6668d1d952f))
* update fs import and exemption loader tests ([99261b8](https://github.com/zotoio/x-fidelity/commit/99261b8f5f32131a9ec6035ab476a7a977c347e5))
* update fs mock to include existsSync for tests ([b7e587c](https://github.com/zotoio/x-fidelity/commit/b7e587c401690b6c0c049bfd744b130da9970d59))
* update regex pattern for SSH GitHub URL normalization ([3b2bb64](https://github.com/zotoio/x-fidelity/commit/3b2bb6445c68fd52ec4a03cc1b15f9152fc2a2b8))
* update test to call loadLocalExemptions instead of loadExemptions ([c8b5fa3](https://github.com/zotoio/x-fidelity/commit/c8b5fa365b3c23f9e4b51a2c5e757684600a3512))
* update test to match exact warning message format ([517c301](https://github.com/zotoio/x-fidelity/commit/517c3010f49fdd1cd49d8ae76b2c5ad57b0bcd0a))


### Features

* **exemptions:** support directories of json files and fix alpha comparison of semver in outdated ([1303392](https://github.com/zotoio/x-fidelity/commit/1303392986600b545910cac17685e950f2f52383))
* support multiple exemption files in archetype-specific directories ([74a413e](https://github.com/zotoio/x-fidelity/commit/74a413ebc50a35bc697d60057ced18b6f9559b96))

## [2.16.9](https://github.com/zotoio/x-fidelity/compare/v2.16.8...v2.16.9) (2024-12-03)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([8bc2154](https://github.com/zotoio/x-fidelity/commit/8bc21541674ffb71cb98261f4fed6ec336582c91))

## [2.16.8](https://github.com/zotoio/x-fidelity/compare/v2.16.7...v2.16.8) (2024-12-03)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([f2d3a1e](https://github.com/zotoio/x-fidelity/commit/f2d3a1e4c0ac1518cf9a5c37a6a62db925f063ca))

## [2.16.7](https://github.com/zotoio/x-fidelity/compare/v2.16.6...v2.16.7) (2024-12-03)


### Bug Fixes

* **build:** upgrade eslint ([fe58362](https://github.com/zotoio/x-fidelity/commit/fe5836208f4507d7078ed023ac5d1467be663e36))

## [2.16.6](https://github.com/zotoio/x-fidelity/compare/v2.16.5...v2.16.6) (2024-11-11)


### Bug Fixes

* **snyk:** resolutions not respected when running license check ([492879d](https://github.com/zotoio/x-fidelity/commit/492879defa36e83d13c800ff4109c29e681cf0e9))

## [2.16.5](https://github.com/zotoio/x-fidelity/compare/v2.16.4...v2.16.5) (2024-11-08)


### Bug Fixes

* **deps:** force resolution - version bump ([9ea4801](https://github.com/zotoio/x-fidelity/commit/9ea4801f24e80b61dc89d835ceea765a478eb6ee))

## [2.16.4](https://github.com/zotoio/x-fidelity/compare/v2.16.3...v2.16.4) (2024-11-07)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([328289a](https://github.com/zotoio/x-fidelity/commit/328289ad01b4e40233e5aefb4362104b53a9d57e))

## [2.16.3](https://github.com/zotoio/x-fidelity/compare/v2.16.2...v2.16.3) (2024-09-13)


### Bug Fixes

* **error:** dir structure check ([801c2ba](https://github.com/zotoio/x-fidelity/commit/801c2baef278ed5c0f452d54cd9b62bcc56edb4f))
* **exemption:** loader issue ([4690f99](https://github.com/zotoio/x-fidelity/commit/4690f99f5b128184dbdb3200c250e0dd089e7785))
* Resolve TypeScript error in isPathInside function ([62544f2](https://github.com/zotoio/x-fidelity/commit/62544f2586641bc7262bb5962cfa6f4f2ecc0b7a))
* Validate input used to build paths ([7a17db4](https://github.com/zotoio/x-fidelity/commit/7a17db46dee4e9d530b0f9d6349256544cce05f4))

## [2.16.2](https://github.com/zotoio/x-fidelity/compare/v2.16.1...v2.16.2) (2024-09-13)


### Bug Fixes

* **errors:** directory structure base fix, and some logic issues in error handling ([e89d783](https://github.com/zotoio/x-fidelity/commit/e89d7837dcfa370863519a57d88f2c5c567509a5))

## [2.16.1](https://github.com/zotoio/x-fidelity/compare/v2.16.0...v2.16.1) (2024-09-13)


### Bug Fixes

* package.json & yarn.lock to reduce vulnerabilities ([8e9bc8e](https://github.com/zotoio/x-fidelity/commit/8e9bc8e262f654fe0f0d35d5cb6465e3eb81b297))

# [2.16.0](https://github.com/zotoio/x-fidelity/compare/v2.15.0...v2.16.0) (2024-09-10)


### Bug Fixes

* Add null checks for child.stdout and child.stderr in collectYarnDependencies function ([cd3f271](https://github.com/zotoio/x-fidelity/commit/cd3f2714ed20dbed7f13c559110cc6721a237380))
* add type assertion to resolve TypeScript error ([aeb4c52](https://github.com/zotoio/x-fidelity/commit/aeb4c525c4a9e30a702ffcfb4b64f6a5a40a7bf3))
* cast util.promisify to unknown before mocking ([f8c5069](https://github.com/zotoio/x-fidelity/commit/f8c5069757fcbcbb3e391262812713dd1f3522f2))
* collect Yarn dependencies when yarn.lock exists ([48c50d1](https://github.com/zotoio/x-fidelity/commit/48c50d19d6d2ea422f41eab3b317e8e2071e11db))
* Collect Yarn dependencies when yarn.lock exists ([2e159f0](https://github.com/zotoio/x-fidelity/commit/2e159f0aa93aad2097c2038a940c1f814a990de6))
* Handle error types in dependency collection functions ([1711cb1](https://github.com/zotoio/x-fidelity/commit/1711cb153c07fcf8706e9a16431eda9ee4873f8e))
* increase Jest timeout for repoDependencyFacts.test.ts ([05185d9](https://github.com/zotoio/x-fidelity/commit/05185d9664bc5e69abd78772c8781308360b4b59))
* Mock child_process.exec to return a mock function ([ebba176](https://github.com/zotoio/x-fidelity/commit/ebba17659553f8f9e69fdc53b6cbdd1cab808412))
* **promisechain:** avoid skipped files ([0cdf825](https://github.com/zotoio/x-fidelity/commit/0cdf825a100900ac545795fb24099778af656653))
* Refactor runEngineOnFiles to use synchronous approach ([77c259e](https://github.com/zotoio/x-fidelity/commit/77c259ea3097b0fac50371acb2605285adc706c5))
* resolve TypeScript error in repoDependencyFacts.test.ts ([075e884](https://github.com/zotoio/x-fidelity/commit/075e884f32547c4b2f1beed730675449c57b26aa))
* resolve TypeScript error in repoDependencyFacts.test.ts ([6c4870e](https://github.com/zotoio/x-fidelity/commit/6c4870e766c18010566b474ff998d0eb084df364))
* Resolve TypeScript errors in repoDependencyFacts.test.ts ([bd47c66](https://github.com/zotoio/x-fidelity/commit/bd47c66c44443b0f485dd83fa345411fb16c85a1))
* update analyzer.test.ts to use expect.any(Number) for fileCount, totalIssues, and warningCount ([66bbd47](https://github.com/zotoio/x-fidelity/commit/66bbd47381694454a4016c5b6f610c4065c7c80e))
* update minimum dependency version comparison ([3373646](https://github.com/zotoio/x-fidelity/commit/3373646a9d2ff52a545dad44241191a952705ce2))
* Update mocking of util.promisify and fs.existsSync in repoDependencyFacts.test.ts ([fa81048](https://github.com/zotoio/x-fidelity/commit/fa81048ff7707c0def5a15d43ea34a36b202a725))
* Update mocking of util.promisify in repoDependencyFacts.test.ts ([8e6a18d](https://github.com/zotoio/x-fidelity/commit/8e6a18d0cb31c049bd0b923f88b655d891dbe712))
* Update repoDependencyFacts to fix test issues ([8d4bfc1](https://github.com/zotoio/x-fidelity/commit/8d4bfc1b9ef45ef64f9df33e2fe82ac0001d93bf))
* Update runEngineOnFiles function to handle asynchronous engine.run() call ([01ec5b0](https://github.com/zotoio/x-fidelity/commit/01ec5b0ed7a662c615000860374bc94c50e499bc))
* Update test expectations for `analyzeCodebase` ([524f0d3](https://github.com/zotoio/x-fidelity/commit/524f0d35e8d26a808189f5e5cbb6ce1b7c525244))
* Update test expectations for error handling in analyzer ([a986892](https://github.com/zotoio/x-fidelity/commit/a986892cf19303458fa2096dfeb58a705de3f242))
* Update test expectations for handling errors during analysis ([6a9c1b9](https://github.com/zotoio/x-fidelity/commit/6a9c1b9ac28696696c63d7e1a5c0a076856ac2d7))
* update unit tests for loading npm and yarn dependencies ([4faf703](https://github.com/zotoio/x-fidelity/commit/4faf703aac483f8a75d81f38545a371d91bb31d3))
* Use `exec` instead of `spawn` for collecting yarn dependencies ([b6bd17c](https://github.com/zotoio/x-fidelity/commit/b6bd17c74fee135b68a3d3fbb7ef6ee0750bf519))


### Features

* Replace execSync with spawned child process for dependency collection ([bd4b38e](https://github.com/zotoio/x-fidelity/commit/bd4b38e5f8dfb5b47c0fe2f07701ac38a16d78b2))
* Update analyzer.test.ts with more precise expectations ([7376191](https://github.com/zotoio/x-fidelity/commit/7376191ecc18f0ac1367ad13b68e52c085c832c5))
* update repoDependencyFacts tests to match implementation ([9514c3a](https://github.com/zotoio/x-fidelity/commit/9514c3a97e1c85bac7aa070c1efae8c0e5625073))

# [2.15.0](https://github.com/zotoio/x-fidelity/compare/v2.14.0...v2.15.0) (2024-09-08)


### Bug Fixes

* **execution:** fact functions and cleanup ([8bd2cfa](https://github.com/zotoio/x-fidelity/commit/8bd2cfa8c4ea6a587fdf4259d34e14e09189fc27))
* Implement more robust error handling and logging ([f391052](https://github.com/zotoio/x-fidelity/commit/f391052b1b3fe8f56bb29deffaf567b2a32ce3d7))
* Implement safe handling of circular JSON references in repoDependencyFacts.ts ([49d95da](https://github.com/zotoio/x-fidelity/commit/49d95da03f4552de4533a0e86d37d4e168bd038e))
* **loading:** consistency with archetype ([47f52e4](https://github.com/zotoio/x-fidelity/commit/47f52e477c1e2ca69c49af767e9af5c8b76a7979))
* Update import statement in repoFilesystemFacts.ts ([903326c](https://github.com/zotoio/x-fidelity/commit/903326cb1dc33da38d5a9fcf7a45f01c4f1f4876))


### Features

* Add JSON schema validation for .xfi-config.json file ([a7d0a75](https://github.com/zotoio/x-fidelity/commit/a7d0a755abe18ae07f8c1ef938b0eb2239af968b))
* Add rule to check for 'nuit' and 'elevate' package imports in the same file ([70d0994](https://github.com/zotoio/x-fidelity/commit/70d09947ff9149da22047a0d2f9dc62448de9fd0))
* Add support for .xfi-config.json file ([e9b60d3](https://github.com/zotoio/x-fidelity/commit/e9b60d31ac1037d6f40505deff5126f18409c269))
* Add support for .xfi-config.json file with sensitiveFileFalsePositives ([5eda4f4](https://github.com/zotoio/x-fidelity/commit/5eda4f4df4d5df048d6342e890825064e78b93e0))
* Add XFIConfig to ResultMetadata and define FileData and ValidationResult types ([ce71d90](https://github.com/zotoio/x-fidelity/commit/ce71d903c5211d1101bf49080a0fc3978b4cdaf2))
* Centralize loading of .xfi-config.json and add it as a fact ([2cca682](https://github.com/zotoio/x-fidelity/commit/2cca68203f2cd04d6802e25e3647455279d009a2))
* create 'bats' subdirectory and move BATS-related content ([1cc0bff](https://github.com/zotoio/x-fidelity/commit/1cc0bff7fec4d0d1b4c7ea60dd8fef027bc689f2))
* improve and modernize the bats test ([586b546](https://github.com/zotoio/x-fidelity/commit/586b546e50de46d5afe4e2dcde34af7fe65bbdb7))
* Improve repoDependencyAnalysis function ([a5638ca](https://github.com/zotoio/x-fidelity/commit/a5638cad789bc52533862dd91b9a964da785c666))
* Rename XFIConfig to RepoXFIConfig ([f91574d](https://github.com/zotoio/x-fidelity/commit/f91574d7c9ab4a1e64a9b2b8fb34fb84929a87bd))
* **repoconfig:** support for local control of false positive sensitive values ([db0b09a](https://github.com/zotoio/x-fidelity/commit/db0b09ae08dea2cc82a26a6a671615033805396b))
* **testing:** cli blackbox testing ([a634258](https://github.com/zotoio/x-fidelity/commit/a6342584a4a7cdfd630437fd9894a02039d0099d))

# [2.14.0](https://github.com/zotoio/x-fidelity/compare/v2.13.1...v2.14.0) (2024-08-29)


### Bug Fixes

* **exemptions:** exclude repos that do not have a remote configured ([c49c4c7](https://github.com/zotoio/x-fidelity/commit/c49c4c7284101822395a6f57b28b0cd302e5505e))


### Features

* Add exemptions feature to manage rule exceptions ([0a91ad8](https://github.com/zotoio/x-fidelity/commit/0a91ad8153651f971c3e34013233f91a0d960ec8))

## [2.13.1](https://github.com/zotoio/x-fidelity/compare/v2.13.0...v2.13.1) (2024-08-28)


### Bug Fixes

* **schema:** relax for fix ([ee5e123](https://github.com/zotoio/x-fidelity/commit/ee5e12350cef95dcdcbe3e4930b1ca6f5a9b4609))

# [2.13.0](https://github.com/zotoio/x-fidelity/compare/v2.12.1...v2.13.0) (2024-08-28)


### Bug Fixes

* add readonly constraint to archetypeSchema ([c74d116](https://github.com/zotoio/x-fidelity/commit/c74d1168733795aac523ba8ceb33020f2f41911e))
* Improve path traversal prevention in repoFilesystemFacts.ts ([f65f595](https://github.com/zotoio/x-fidelity/commit/f65f59532683e7a8e392e8bcd259869b8fe2f006))
* **schema:** fix schema validation and incorrect default rule code in setupEngine ([0a3c65c](https://github.com/zotoio/x-fidelity/commit/0a3c65ce5d0873ec1b3e679ac343ae91e6c0e463))
* update import statement for RuleConfigSchema ([a658127](https://github.com/zotoio/x-fidelity/commit/a6581272708bcf77a37040c1fb0a6d0411d29a36))


### Features

* Add new types for IsBlacklistedParams and isWhitelistedParams ([2c43c82](https://github.com/zotoio/x-fidelity/commit/2c43c822f5dbeeb8f10fcf157886fe607e451fe3))
* Update archetype typedef and jsonschema to validate semver strings ([2bba2b1](https://github.com/zotoio/x-fidelity/commit/2bba2b15a66f0937609b04815b029ff181f86ccf))

## [2.12.1](https://github.com/zotoio/x-fidelity/compare/v2.12.0...v2.12.1) (2024-08-25)


### Bug Fixes

* **deps:** reduce noise in dependency checks ([88f3ecb](https://github.com/zotoio/x-fidelity/commit/88f3ecb74a29624ee91594a06900c54a2d9fd7f9))

# [2.12.0](https://github.com/zotoio/x-fidelity/compare/v2.11.0...v2.12.0) (2024-08-25)


### Bug Fixes

* **analysis:** ensure long single-line files are catered for and npm namespaces ([509b4db](https://github.com/zotoio/x-fidelity/commit/509b4db1c3bb3f2cb487e043f5d23689bc8ed42d))
* Handle [@namespace](https://github.com/namespace) packages in dependency analysis ([b5314ac](https://github.com/zotoio/x-fidelity/commit/b5314ac2b67f1bf241cbad3229c0ce3498bd9175))
* Refactor repoFileAnalysis function to improve performance ([ae725bb](https://github.com/zotoio/x-fidelity/commit/ae725bbab307008424bb7494444e66eaca684aad))


### Features

* Implement file content splitting for analysis ([4d5f049](https://github.com/zotoio/x-fidelity/commit/4d5f04938d7fd78425e79ac74143439be1552879))

# [2.11.0](https://github.com/zotoio/x-fidelity/compare/v2.10.0...v2.11.0) (2024-08-24)


### Features

* Add documentation for custom operators in x-fidelity ([d015fff](https://github.com/zotoio/x-fidelity/commit/d015fff73189704486f2a51eb8a235f2c161152d))
* Add new operators section in README ([a306c4d](https://github.com/zotoio/x-fidelity/commit/a306c4db3b4043e8e8cf6fcd9bb78e2282c82ec9))
* Update README.md with new features and enhancements ([751b4ed](https://github.com/zotoio/x-fidelity/commit/751b4eddb5abafd7500f52ec403b5a42d7b0c447))

# [2.10.0](https://github.com/zotoio/x-fidelity/compare/v2.9.0...v2.10.0) (2024-08-24)


### Bug Fixes

* Add error logging in fileContains operator ([7a41a2f](https://github.com/zotoio/x-fidelity/commit/7a41a2f8cddfc5f84a8fff87f64be07fed8ee2cd))
* Correct the logic in the fileContains operator ([9f45231](https://github.com/zotoio/x-fidelity/commit/9f45231805e1b21afe64c8a72b884704ceb58b08))
* **filecontains:** ensure detailed line numbers are included in results ([3d94716](https://github.com/zotoio/x-fidelity/commit/3d947164d10e42fc76bb68ac92d51db8334b5b6e))
* Update fileContains operator implementation ([6a11a46](https://github.com/zotoio/x-fidelity/commit/6a11a4600e23f980086472219d355106c188faf7))
* Update fileContains operator implementation ([f9a8f03](https://github.com/zotoio/x-fidelity/commit/f9a8f0379fa1944b5565e2f644735aa4fc24da3c))
* Update fileContains test cases to provide second argument ([9d68f43](https://github.com/zotoio/x-fidelity/commit/9d68f432a0348136a19b4b350776518e852a5c6d))
* Update fileContains test expectations ([767d72f](https://github.com/zotoio/x-fidelity/commit/767d72fe233672682f92612dbd2116eeaf10a0f3))


### Features

* Add repoFileAnalysis function to analyze files in a repository ([a100cf3](https://github.com/zotoio/x-fidelity/commit/a100cf384f71028a0a5aae70b0ac666f013f912a))
* Allow checkPattern param in repoFileAnalysis to be an array of patterns ([896fc2d](https://github.com/zotoio/x-fidelity/commit/896fc2d48294183028cffb48bd9f2604fe9b774b))

# [2.9.0](https://github.com/zotoio/x-fidelity/compare/v2.8.0...v2.9.0) (2024-08-23)


### Features

* Add exemptions section to README ([8e43dfe](https://github.com/zotoio/x-fidelity/commit/8e43dfe70c652bdb1e09b876fc2efbe785e4a3f5))

# [2.8.0](https://github.com/zotoio/x-fidelity/compare/v2.7.0...v2.8.0) (2024-08-23)


### Bug Fixes

* Add archetype parameter to loadExemptions function ([0a9d95b](https://github.com/zotoio/x-fidelity/commit/0a9d95b867b03245d65b71b6fe78ec708ac494e4))
* Add shared secret to exemption loader request ([37479d4](https://github.com/zotoio/x-fidelity/commit/37479d4ea256fde577f6da5e2841b94337a3c7e6))
* Add test case for using default archetypes when no config sources are provided ([bf90659](https://github.com/zotoio/x-fidelity/commit/bf90659578c07bd15dbdeea7a2177003af550f8f))
* Change log level from debug to info for fetching remote exemptions ([056b55b](https://github.com/zotoio/x-fidelity/commit/056b55b2b3818d8487db13af95d0237f619fc464))
* Clone and update exempted rule before adding to engine ([c731b31](https://github.com/zotoio/x-fidelity/commit/c731b311daa0890c6afcac6328dcd1713b1fe4c0))
* Ensure at least two rules are added to the engine ([8c58418](https://github.com/zotoio/x-fidelity/commit/8c58418577b06b760a0e2b112d8e8c60a6e08f63))
* Ensure at least two rules are added to the engine for testing purposes ([a6da7aa](https://github.com/zotoio/x-fidelity/commit/a6da7aafc117b759c37a5d939b350bbaa49520f8))
* Handle errors when loading rules and add default rules ([87216a4](https://github.com/zotoio/x-fidelity/commit/87216a4beb5e51c4a2faaff9841bd1ae8f23b773))
* Import exemptions object from archetypes module and handle undefined case in loadDefaultExemptions ([c523352](https://github.com/zotoio/x-fidelity/commit/c523352bfe2391022a54fe4cdeadbde81c97aada))
* Normalize GitHub URL by correctly handling forward slashes ([6ed2b49](https://github.com/zotoio/x-fidelity/commit/6ed2b49b267b2c72941abf017839d9a2920f526e))
* Normalize GitHub URLs when checking exemptions ([8645ace](https://github.com/zotoio/x-fidelity/commit/8645ace1b06e2b9e5eedbfe06b207129fa3548af))
* Refactor exemption handling in ConfigManager ([f114d45](https://github.com/zotoio/x-fidelity/commit/f114d458fd73404d3a1060b740c33c3d1a547304))
* Remove unnecessary rule addition logic ([620d365](https://github.com/zotoio/x-fidelity/commit/620d365c0c9ce19f738fe20866e3d5921f47f130))
* Update exemptions file path in ConfigManager test ([af72043](https://github.com/zotoio/x-fidelity/commit/af720434a88ac03953d757ca996a16d829d8eab0))
* Update expectation for mockAddRule in engineSetup.test.ts ([177b39c](https://github.com/zotoio/x-fidelity/commit/177b39c7f7dc6ba82dcbd8487cf726c7c14c0867))
* Update expectations for `mockAddRule` in `engineSetup.test.ts` ([317acdb](https://github.com/zotoio/x-fidelity/commit/317acdb0ccb3e7d3c9ecd2921f2b5f6240910aeb))
* Update loadExemptions function calls to match expected parameters ([8f6da9a](https://github.com/zotoio/x-fidelity/commit/8f6da9a2261afde5f1cdc0f256fd8fb405783fb6))
* Update repository URLs in exemption configurations ([9bbfcb2](https://github.com/zotoio/x-fidelity/commit/9bbfcb2bf9879212034ae7d02644f64b626eb283))
* Update test case for using default archetypes when no config sources are provided ([ca42766](https://github.com/zotoio/x-fidelity/commit/ca427665c9ee687feb8e290b29382ac41eac2f17))
* Update test for default archetype config when unable to load local config ([42661f6](https://github.com/zotoio/x-fidelity/commit/42661f601d5f6a57e07e199f5ac15344d8368b1b))
* Use isExempt function from exemptionLoader ([c34dd13](https://github.com/zotoio/x-fidelity/commit/c34dd139cb8ab18e9d8eb3c5fcf3b0ec0fcb5044))


### Features

* add example exemptions JSON files for node-fullstack and java-microservice archetypes ([4e00c9d](https://github.com/zotoio/x-fidelity/commit/4e00c9de25bc828849ce8d48948d504485afb6b5))
* add exemptions route to config server ([1618737](https://github.com/zotoio/x-fidelity/commit/16187374bbdae1d73283c07edcb592723ca7c716))
* add remote exemption loading to ExecutionConfig ([d5e2862](https://github.com/zotoio/x-fidelity/commit/d5e28624838dab32b33c99323ff30aee0ce9958b))
* add telemetry event for allowed exemptions ([94ad81b](https://github.com/zotoio/x-fidelity/commit/94ad81b01424ce3a26f321a2423bce459c58f3f9))
* add unit tests for exemptions-related features ([f757a67](https://github.com/zotoio/x-fidelity/commit/f757a671e7d75da93f1dcaa94344acbc95125ab7))
* Add unit tests for normalizeGitHubUrl function ([f322fa2](https://github.com/zotoio/x-fidelity/commit/f322fa2bb44e42d3c3ad64ee75f8215ebf14e482))
* Enhance normalizeGitHubUrl to support self-hosted GitHub instances ([958837d](https://github.com/zotoio/x-fidelity/commit/958837d51c98b1f66b8aa99b7da4be2b0c10b728))
* **exemptions:** basic exemptions model ([949cdd3](https://github.com/zotoio/x-fidelity/commit/949cdd363a35b410aa3a7017eb6020c52f5c00c8))
* **exemptions:** remotely managed exemptions ([1bf485c](https://github.com/zotoio/x-fidelity/commit/1bf485ca370f40bf4fff5ff48a7a0ba1bdd7a3bf))
* Implement remote, local, and default exemption loading ([6f6c74f](https://github.com/zotoio/x-fidelity/commit/6f6c74f9bb09a2cd8e5465feb41368adb7d5d83e))

# [2.7.0](https://github.com/zotoio/x-fidelity/compare/v2.6.0...v2.7.0) (2024-08-22)


### Bug Fixes

* Add missing `repoUrl` property to `mockParams` object ([e94114d](https://github.com/zotoio/x-fidelity/commit/e94114dced7c9f6b4f53caa034937d07313abd71))


### Features

* **exemption process:** allow a repo to have a timelimited waiver for a given rule ([42d4b7d](https://github.com/zotoio/x-fidelity/commit/42d4b7de181131bbc3400710fc86876f4f3d8748))

# [2.6.0](https://github.com/zotoio/x-fidelity/compare/v2.5.0...v2.6.0) (2024-08-22)


### Bug Fixes

* Change log level from debug to info for better visibility ([8173462](https://github.com/zotoio/x-fidelity/commit/817346206d084a0dcad79ceeec548b8b51342135))
* **deps:** monorepo fixes ([07021e8](https://github.com/zotoio/x-fidelity/commit/07021e8af78db05515ffe8e73b337f431c8caf61))
* Fix issues with dependency version validation and handling ([75282c1](https://github.com/zotoio/x-fidelity/commit/75282c1d392c49d8f152eac29fdedca7e7add2fa))
* Improve implementation and test coverage of openaiAnalysisHighSeverity ([acaf784](https://github.com/zotoio/x-fidelity/commit/acaf784b79560c9f303cab65c76e873419275ebc))
* Improve local dependency collection ([8d7732f](https://github.com/zotoio/x-fidelity/commit/8d7732f80cfea9beef6b35656b8488168070a9ef))
* improve semver range checking in repoDependencyAnalysis ([ba15f5a](https://github.com/zotoio/x-fidelity/commit/ba15f5ab31c1e2228e26e1eaeeea7d060f5ac033))
* Improve semver version comparison logic ([8f943e1](https://github.com/zotoio/x-fidelity/commit/8f943e1477fb041d97828829306c6de4af8695ae))
* Update `collectLocalDependencies` function to return correct dependency structure ([fc3fccb](https://github.com/zotoio/x-fidelity/commit/fc3fccb8780e23816c6cc6c18789a52395e9bbf9))
* Update collectLocalDependencies function to return expected structure ([42ee815](https://github.com/zotoio/x-fidelity/commit/42ee8159311692a10db648aafa1c34002ad7572e))
* Update mocking of `collectLocalDependencies` function in tests ([5d8d647](https://github.com/zotoio/x-fidelity/commit/5d8d647702e1cdd8cd979d9abd5da9791e9eed3c))
* Update repoDependencyAnalysis function to only add dependencies that don't meet requirements ([1070e5f](https://github.com/zotoio/x-fidelity/commit/1070e5faf990e1287a9ba6d36297ef8781e04658))
* Update semverValid function to return correct result ([158f555](https://github.com/zotoio/x-fidelity/commit/158f55506b6f96ecd18b04ca30557f5a03849a3b))
* Update test case for collectLocalDependencies function ([4b35d3f](https://github.com/zotoio/x-fidelity/commit/4b35d3faf3c9d9832e9d1a00d26f6b7ece2c19ca))
* Use toEqual for boolean comparisons in openaiAnalysisHighSeverity tests ([16425c6](https://github.com/zotoio/x-fidelity/commit/16425c67e07fa7c14569fa739b38f2353fa8a466))


### Features

* Add collectLocalDependencies function to repoDependencyFacts ([8aa6311](https://github.com/zotoio/x-fidelity/commit/8aa6311e3471ceed1bf07f2564b5de086d5440f1))
* Add support for version ranges in repoDependencyAnalysis ([ce82a21](https://github.com/zotoio/x-fidelity/commit/ce82a218227eca3b3ccb42cab393dcfe20e3de29))
* create comprehensive unit test suite for repoDependencyFacts.ts ([a92b83b](https://github.com/zotoio/x-fidelity/commit/a92b83b9ffedffd5f47e15cd7a7fed40353d3754))
* rewrite src/facts/repoDependencyFacts.test.ts with correct mocking and comprehensive test coverage ([66e26c2](https://github.com/zotoio/x-fidelity/commit/66e26c2bad485c71adca1187aafb81796d38148f))

# [2.5.0](https://github.com/zotoio/x-fidelity/compare/v2.4.0...v2.5.0) (2024-08-21)


### Bug Fixes

* Update README.md with new CLI options and environment variables ([04d5172](https://github.com/zotoio/x-fidelity/commit/04d5172c0e9e24a0731f6d009f7495a789f85023))


### Features

* Add support for Docker and HTTPS/TLS ([7eeb497](https://github.com/zotoio/x-fidelity/commit/7eeb497b1fd115346c029acde39b220bcc5ea3ec))

# [2.4.0](https://github.com/zotoio/x-fidelity/compare/v2.3.0...v2.4.0) (2024-08-21)


### Bug Fixes

* add unit tests for all files except typeDefs ([b1d1fd9](https://github.com/zotoio/x-fidelity/commit/b1d1fd9d069d2bd54712ae0cf96a9e48ebec903e))
* **deps:** make artillery a peer dependency ([d89361f](https://github.com/zotoio/x-fidelity/commit/d89361fcc24744cfa52df6cbe52b6117b92e46d8))
* Handle errors during execution ([48a9488](https://github.com/zotoio/x-fidelity/commit/48a94882eff7db64e0f996a6b55d3dde9eca080b))
* Improve error handling and execution flow in index.ts ([0b8ca73](https://github.com/zotoio/x-fidelity/commit/0b8ca73d3cc4b0b498ab9a8cf93d9d67965243af))
* Increase timeout for test case to prevent "force exited" issue ([ab3d0b3](https://github.com/zotoio/x-fidelity/commit/ab3d0b30696f6056df8a386b5eb366f4c545dbfa))
* **logging:** silence in logs and increase unit test coverage ([5017a12](https://github.com/zotoio/x-fidelity/commit/5017a1216c5dedc443d40787aa70ea40814de49c))
* Mock axiosClient instead of axios in rules/index.test.ts ([40e7410](https://github.com/zotoio/x-fidelity/commit/40e74108b45813244fa3810649d1b681a1e85af5))
* Pass executionLogPrefix to startServer and analyzeCodebase ([99a6692](https://github.com/zotoio/x-fidelity/commit/99a669232d77a8bfaeca22590efcdc9fd9ecb80a))
* Prevent unnecessary process exit in test environment ([aab777f](https://github.com/zotoio/x-fidelity/commit/aab777f76f4ab3c98322c93250bbfa5d35f2812a))
* Remove setTimeout and directly call process.exit(1) in error handling function ([8a7587e](https://github.com/zotoio/x-fidelity/commit/8a7587ea169ff8313d187f4ea71487eb8273623f))
* resolve TypeScript errors in telemetry utility ([3c68aa1](https://github.com/zotoio/x-fidelity/commit/3c68aa1d4d3b2594dd05fa120233a56ff06d5206))
* Update import and call of main function in index.test.ts ([70e11b1](https://github.com/zotoio/x-fidelity/commit/70e11b18dfbf272035e96a004b6f7b889644c229))
* Update import and export in index.test.ts and index.ts ([b15203d](https://github.com/zotoio/x-fidelity/commit/b15203d8aa3b37b211c5a57edd8dd0ea58c9d93f))
* Update index.test.ts ([b3d1799](https://github.com/zotoio/x-fidelity/commit/b3d1799153de1f502f5b897d268c30999189f1ca))
* Update process.exit usage in src/index.ts ([ac398c3](https://github.com/zotoio/x-fidelity/commit/ac398c31cd944e2c062db5d7b57254f026a89f8c))
* Update startServer function call and process exit handling ([7be6c28](https://github.com/zotoio/x-fidelity/commit/7be6c280dda46f49a8c1c45149b93fcadd261ccb))
* update test expectations ([d24279e](https://github.com/zotoio/x-fidelity/commit/d24279e8520f882260299190b9562831b7c79528))
* Update test expectations to match actual error messages ([454aea6](https://github.com/zotoio/x-fidelity/commit/454aea6a8cf38cfdd1b9ed31288c119f7f37dbbf))
* update type of `code` parameter in `mockImplementation` function ([f7aab15](https://github.com/zotoio/x-fidelity/commit/f7aab15c67e155da2fedb29a704633629561964a))


### Features

* centralise the axios client usage in one file and implement exponential backoff ([9a6d000](https://github.com/zotoio/x-fidelity/commit/9a6d00051c92cbe498c429503356f445d64d1685))

# [2.3.0](https://github.com/zotoio/x-fidelity/compare/v2.2.0...v2.3.0) (2024-08-20)


### Bug Fixes

* Add clearCache import and ConfigManager import to configServer.ts ([4212096](https://github.com/zotoio/x-fidelity/commit/4212096ea2459e4c55a7c6b396755d72f440ecb6))
* address SSRF risks in `githubWebhookRoute` ([9b6d64a](https://github.com/zotoio/x-fidelity/commit/9b6d64acf7e49604815b606292890a4b50a11ab8))
* Clear rule list cache correctly ([3cb17c7](https://github.com/zotoio/x-fidelity/commit/3cb17c7e54e9c8be19b03405a3b13eeaf21bf16c))
* import missing middleware functions ([fd00a4f](https://github.com/zotoio/x-fidelity/commit/fd00a4f9b4b2dac3ef41782f517186a07ce1c53c))
* Improve security and mitigate potential SSRF risks in configManager and configServer ([f87ccab](https://github.com/zotoio/x-fidelity/commit/f87ccab24c465d374ef191973d4f3f500ebcca00))
* move the github webhook route and related update code to separate route file ([4deb57e](https://github.com/zotoio/x-fidelity/commit/4deb57e57f4b95cda757aaa84e8c3f89485e24cd))
* Properly handle asynchronous operations in configServer.test.ts ([2de6174](https://github.com/zotoio/x-fidelity/commit/2de6174330e518a49c0530455f9bfd4118f648d2))
* Refactor ConfigManager class ([7f1c2fe](https://github.com/zotoio/x-fidelity/commit/7f1c2fe2e895684145c843615876e3118be095a9))
* Update configServer to use RuleConfig from ConfigManager ([100c0b3](https://github.com/zotoio/x-fidelity/commit/100c0b301423ca111aa8e452073d3c190a317fbc))
* Update engineSetup.test.ts to use ConfigManager and setLogPrefix ([c36c64d](https://github.com/zotoio/x-fidelity/commit/c36c64de689a952a500a360dffe8e57605d2dbac))
* Update error message and fix warning detection test ([9f37bf5](https://github.com/zotoio/x-fidelity/commit/9f37bf502407404ddad355a5ac7d4d8710153b80))
* Update mock configuration in engineSetup.test.ts ([fd3d7db](https://github.com/zotoio/x-fidelity/commit/fd3d7dbaab3ae51b5c6cbc6d0970f3bf2b2db32c))
* Update mockParams object to include archetypeConfig property ([b0c9628](https://github.com/zotoio/x-fidelity/commit/b0c9628050643fbc508a087f2387144961a74264))
* Update rule schema definition ([ed5d87a](https://github.com/zotoio/x-fidelity/commit/ed5d87a3579cd2f6d7eb414207a3cfb9bd571d70))
* Update ruleSchema to match RuleProperties type ([0f09992](https://github.com/zotoio/x-fidelity/commit/0f099925b14d32d044e5c8fb3583cfec4bb39ae7))
* Update test configuration for analyzer ([f0b139d](https://github.com/zotoio/x-fidelity/commit/f0b139d7b208553d131d682e19a7b0ccebd5febf))
* Update test expectation for loadFacts ([ee04ee0](https://github.com/zotoio/x-fidelity/commit/ee04ee0c38883e5c073e6360fe6febed45e42cc6))
* Update test expectations for loadFacts ([4c57421](https://github.com/zotoio/x-fidelity/commit/4c57421de624622404e6232f450057f200781a2b))
* Validate and sanitize archetype input in configManager ([3a92119](https://github.com/zotoio/x-fidelity/commit/3a921195beb1ac0da0421aafb443adbf77d83eb2))


### Features

* add clearcache route ([89e9633](https://github.com/zotoio/x-fidelity/commit/89e96333ae1bb36b4673c09ddc8b69f6b1ed9740))
* Add file watcher for local config path ([43da2f3](https://github.com/zotoio/x-fidelity/commit/43da2f3b84f2c852426813068487702c4745d549))
* Add GitHub webhook route ([cab04ae](https://github.com/zotoio/x-fidelity/commit/cab04ae5c7fbba954e9b85c8182ec3595215a8f9))
* Add GitHub webhook route to handle archetype or rule config updates ([5af3d63](https://github.com/zotoio/x-fidelity/commit/5af3d63d4d9ef6f3f48a5be4001d3f28f1522d6c))
* Add high-value unit tests for utility functions ([f90d5e2](https://github.com/zotoio/x-fidelity/commit/f90d5e218cc8c5743515744fc9584801c3003398))
* Add input validation for URL parameters and telemetry data ([77bdfaa](https://github.com/zotoio/x-fidelity/commit/77bdfaa4e35c34e62c341fca6f87db46726db993))
* Add support for additional properties in rule schema ([98826e5](https://github.com/zotoio/x-fidelity/commit/98826e5edad1a443d6299a1ad3b970517c384783))
* add viewcache route ([1fa105c](https://github.com/zotoio/x-fidelity/commit/1fa105c6c29ef05b8eb5312c638785dd5d56af07))
* Create comprehensive unit test file for engineSetup.ts ([50556ce](https://github.com/zotoio/x-fidelity/commit/50556ce257cb579ef856b74a012b986b81490f2b))
* Implement GitHub webhook to update local config ([351fbf0](https://github.com/zotoio/x-fidelity/commit/351fbf022100f8e9acc3734b291afdac9057e386))
* Implement server routes and middleware ([3de18a6](https://github.com/zotoio/x-fidelity/commit/3de18a6cab08a26ecd51f7dc9148da5fee93aeba))
* load all RuleConfig for a given archetype into the ExecutionConfig ([a122c52](https://github.com/zotoio/x-fidelity/commit/a122c52986adeadeec9085b5c94bfd5e142e80d8))
* move the configServer features related to caching into a new file ([95a9908](https://github.com/zotoio/x-fidelity/commit/95a9908c97878b062337e100b37ae1d4919b53e5))
* **rules:** github hook to refresh config ([2485fbe](https://github.com/zotoio/x-fidelity/commit/2485fbe36a9f5102fe815209e0961f604b0e6f30))
* **rules:** optimise loading of rules, and filesystem watcher for server ([6e6c5ac](https://github.com/zotoio/x-fidelity/commit/6e6c5ac0a784ab76b9d3ec476de580225932b443))
* update configserver to use new route files ([eda8240](https://github.com/zotoio/x-fidelity/commit/eda8240a09073612f060d65494d4973b1b170c94))
* Update rule schema to improve flexibility and compatibility ([989bdf6](https://github.com/zotoio/x-fidelity/commit/989bdf64ead3148a366c046f6c0e883d6b1b1109))

# [2.2.0](https://github.com/zotoio/x-fidelity/compare/v2.1.0...v2.2.0) (2024-08-20)


### Bug Fixes

* Centralize SHARED_SECRET check in sendTelemetry function ([2a99183](https://github.com/zotoio/x-fidelity/commit/2a99183059e815dc56ba731da9f432bad5049e16))
* Ensure object to be masked is not mutated in expressLogger ([af111a8](https://github.com/zotoio/x-fidelity/commit/af111a8eb6a9467f84d35db65ed21466097dfc38))


### Features

* add shared secret header security to restrict access to the telemetry server using an environment variable, and update the client in the same way ([7935f69](https://github.com/zotoio/x-fidelity/commit/7935f6958bec827b8d4c8d144d4dc8c647948934))
* Apply shared secret check only to the /telemetry route ([72e7466](https://github.com/zotoio/x-fidelity/commit/72e746623d5058f4b7b36f9f00494d5aad4f9add))
* centralise masking in one reusable function ([d2f29d5](https://github.com/zotoio/x-fidelity/commit/d2f29d53f65ee76112774a2590559b1538af855e))
* Mask X-Shared-Secret header in request and response logs ([c6056ce](https://github.com/zotoio/x-fidelity/commit/c6056cecc527119123e8fb2d2f06ea44a9cbe803))
* partially mask shared secret and avoid logging it in full ([953be35](https://github.com/zotoio/x-fidelity/commit/953be35ab716692439e95121b13e96cbe0347716))
* **telemetry:** option for sharedSecret for telemetry client and server ([f85b312](https://github.com/zotoio/x-fidelity/commit/f85b312f7773668cd44e1e1799694ac421825a35))

# [2.1.0](https://github.com/zotoio/x-fidelity/compare/v2.0.0...v2.1.0) (2024-08-19)


### Bug Fixes

* Add missing mock implementation for fs.existsSync in repoDependencyFacts.test.ts ([f69c22b](https://github.com/zotoio/x-fidelity/commit/f69c22b6421c1e98714c5391a6f6c97e0f11f917))
* Add mocks for semver in repoDependencyFacts.test.ts ([a852ff5](https://github.com/zotoio/x-fidelity/commit/a852ff5092a0f7f65292b98013e435685a16f2c2))
* Add null check for input in validateInput function ([c5d8bf3](https://github.com/zotoio/x-fidelity/commit/c5d8bf3c735ac6aa9598ba5254de14a9f75ddcf1))
* Add type annotation for mockLocalDependencies in repoDependencyFacts.test.ts ([79cfff0](https://github.com/zotoio/x-fidelity/commit/79cfff07a78328a881ae24309564e4b6954f7770))
* Correct the structure of LocalDependencies in repoDependencyFacts.test.ts ([346924f](https://github.com/zotoio/x-fidelity/commit/346924f93b968baf123f4fc5e2e7de45dbba81e9))
* Ensure dependencies are properly added to the result array in processNpmDependencies ([21025db](https://github.com/zotoio/x-fidelity/commit/21025db2ef520c104bb32d3dd0396d93503e3061))
* **facts:** ensure dependencies are compatible with npm and yarn, and extensible ([fe0e40f](https://github.com/zotoio/x-fidelity/commit/fe0e40f7e0fb2c263fa63ad2eeda1ff5574fc669))
* Fix mocked import path for cli options ([8806297](https://github.com/zotoio/x-fidelity/commit/8806297dafe2d6a587efb6957c93028964393879))
* fix type annotation for collectLocalDependencies mock ([d2a7739](https://github.com/zotoio/x-fidelity/commit/d2a7739fcd78f775dbff648727729204474507ac))
* Fix type error in unit test ([58f14aa](https://github.com/zotoio/x-fidelity/commit/58f14aaaf92070805194f5012df798fe78f3bdcb))
* Fix TypeScript errors in repoDependencyFacts.test.ts ([50a2029](https://github.com/zotoio/x-fidelity/commit/50a2029bb49304177a2fec1f092642bf19689a4e))
* Fix TypeScript errors in repoDependencyFacts.test.ts ([a3da3da](https://github.com/zotoio/x-fidelity/commit/a3da3dacf4cf08810969e8b988c978ef7781c66b))
* Fix TypeScript errors in repoDependencyFacts.test.ts ([1869968](https://github.com/zotoio/x-fidelity/commit/1869968282cbc609235ee061d953081bd6113675))
* Handle missing package manager files gracefully ([95da9ab](https://github.com/zotoio/x-fidelity/commit/95da9ab4fe5dcfadfae6209ffffcf74ed6274f06))
* Implement dependency analysis tests ([9b0426b](https://github.com/zotoio/x-fidelity/commit/9b0426b2a5be278f9dae8f8d4eee8293b7cffad9))
* Improve error handling and return value in collectLocalDependencies function ([7c6c06c](https://github.com/zotoio/x-fidelity/commit/7c6c06c223bc5f239f937b707948b67320ba0d2d))
* Improve input validation and add logging for potential attacks ([e5e2cd4](https://github.com/zotoio/x-fidelity/commit/e5e2cd4bd907d54837d512e5907b49ce6f4d8f6b))
* Mock `collectLocalDependencies` function in `repoDependencyFacts.test.ts` ([33a1634](https://github.com/zotoio/x-fidelity/commit/33a16349c7bb4396d7217138deda2ddf13a07d52))
* mock collectLocalDependencies function correctly ([fde463a](https://github.com/zotoio/x-fidelity/commit/fde463aa536ce466b605d038acefe57ef85c91bc))
* Mock fs and child_process modules in repoDependencyFacts.test.ts ([f43c3a5](https://github.com/zotoio/x-fidelity/commit/f43c3a53d8961962cfda6107a37815a3e13bbc01))
* Refactor repoDependencyFacts tests ([cb2fd9a](https://github.com/zotoio/x-fidelity/commit/cb2fd9a3d941061fc9aff928b17c6640498abdf9))
* Resolve TypeScript error in repoDependencyFacts.test.ts ([6bb0f22](https://github.com/zotoio/x-fidelity/commit/6bb0f220538e4b672309f20c57688a9b2de1039a))
* rewrite src/facts/repoDependencyFacts.test.ts to ensure it adheres to the logic in the implementation and that it mocks required objects correctly and covers all positive and negative use-cases ([2d4548c](https://github.com/zotoio/x-fidelity/commit/2d4548c5b922bea31c7b1aa5accafbf1ae1593dd))
* Throw error when no lock file is found and return empty array when no local dependencies are found ([a30a660](https://github.com/zotoio/x-fidelity/commit/a30a6600c3b930cbb8237c1e82f91e3b5d76bc91))
* Update `src/facts/repoDependencyFacts.test.ts` to fix TypeScript error ([254f770](https://github.com/zotoio/x-fidelity/commit/254f7706f807558f5a227c2091953a499e70c23c))
* Update collectLocalDependencies test to return an empty array ([04bdda7](https://github.com/zotoio/x-fidelity/commit/04bdda734f335c06c56965fa7043c9d40c5e78a7))
* Update error message expectation in test ([6f287bd](https://github.com/zotoio/x-fidelity/commit/6f287bd9bfca340d9e2e3f6fd3d268196251effe))
* Update yarn dependency processing logic ([5f2a39d](https://github.com/zotoio/x-fidelity/commit/5f2a39dbd19e3a72bee7bb9964568ff2dfc499b5))
* Use yarn instead of npm to collect local dependencies ([482b479](https://github.com/zotoio/x-fidelity/commit/482b479a372897f95c50bed63a2ca9faac92b96d))


### Features

* create comprehensive unit test file for repoDependencyFacts ([1253f74](https://github.com/zotoio/x-fidelity/commit/1253f744dcfa6c267c33ae02dfbf418710d1c85b))
* Decompose collectLocalDependencies ([b865d09](https://github.com/zotoio/x-fidelity/commit/b865d0977482f33f9708f623655bcf3e26812b25))
* Implement recursive processing of dependencies in repoDependencyFacts.ts ([557916a](https://github.com/zotoio/x-fidelity/commit/557916abe77acb9eaefd682e8b2374d4fd000abc))
* Refactor dependency collection and processing ([fc7e037](https://github.com/zotoio/x-fidelity/commit/fc7e0376d59992f573af7fe1b3a031f3cb279a81))
* Rewrite the entire `src/facts/repoDependencyFacts.test.ts` based on the new implementations ([83466b4](https://github.com/zotoio/x-fidelity/commit/83466b41ba8ebcb87593277adeab9c695f7200c7))
* update `findPropertiesInTree` to operate on the new output structure of the `LocalDependencies` ([608f301](https://github.com/zotoio/x-fidelity/commit/608f301ef4997dad923952700672115c5725149a))
* update code to conform to updated `LocalDependencies` interface ([864bc68](https://github.com/zotoio/x-fidelity/commit/864bc683b95eccfa92f5b4135e7e0821994928e9))
* update repoDependencyFacts unit tests to match implementations ([7f56ead](https://github.com/zotoio/x-fidelity/commit/7f56ead5659d45ddbc359d5976a47cc16154452e))

# [2.0.0](https://github.com/zotoio/x-fidelity/compare/v1.17.0...v2.0.0) (2024-08-17)


### Bug Fixes

* Add additional logging to configManager.ts ([bab63c1](https://github.com/zotoio/x-fidelity/commit/bab63c13a714d6d69440380c886a227b388baa41))
* Add missing properties to ResultMetadata in engineSetup.ts ([1c2d276](https://github.com/zotoio/x-fidelity/commit/1c2d276512a4958b5ae75cec44df00e36551bccc))
* Add missing properties to ResultMetadata interface ([eb2b71f](https://github.com/zotoio/x-fidelity/commit/eb2b71f375f7d0f8615213f693704e91f8a610f0))
* Add missing properties to telemetry metadata ([30fefbc](https://github.com/zotoio/x-fidelity/commit/30fefbc3709bb1d13a3624d2e4d66c6b6f78e7a7))
* Correct the typo in the GPT-4 model name ([438c772](https://github.com/zotoio/x-fidelity/commit/438c77288fe58441adc7956b4ba64db445e7d82f))
* Fix TypeScript errors in src/index.ts ([30fc784](https://github.com/zotoio/x-fidelity/commit/30fc784580763d956c75003c965821e646bf716d))
* Fix TypeScript errors in test files ([25af375](https://github.com/zotoio/x-fidelity/commit/25af3759ff321a91d4e0f6a90531a384888c7a39))
* handle network error in loadRules test ([05a26e6](https://github.com/zotoio/x-fidelity/commit/05a26e634b2a6b43ec860e01ad74caf26dc924db))
* Import fs module in telemetryCollector.test.ts ([64245d9](https://github.com/zotoio/x-fidelity/commit/64245d90786a3be99a255b5d240afc6dd4737c81))
* Improve error handling in ConfigManager ([d1bb512](https://github.com/zotoio/x-fidelity/commit/d1bb5127a3e0bac630d613afced3fdf849b8b211))
* refactor `src/core/engine.test.ts` into separate test files ([4055f8f](https://github.com/zotoio/x-fidelity/commit/4055f8f3179d44862fd779d8bb09022cb4d946b9))
* Refactor analyzeCodebase function to return ResultMetadata ([81d1936](https://github.com/zotoio/x-fidelity/commit/81d1936618ac2abd0a85718c2f1f0b910fb8b910))
* Remove expectation of `mockLogPrefix` in `loadRules` calls ([7b8669e](https://github.com/zotoio/x-fidelity/commit/7b8669e864150123e02ba025f73652a82898c723))
* Remove unused import and update metadata object ([ff4bfc0](https://github.com/zotoio/x-fidelity/commit/ff4bfc0ad0ed13bc3c919722c34de81160e486fa))
* Update event handling in engineSetup.ts ([73e5358](https://github.com/zotoio/x-fidelity/commit/73e53583b82fab78b72f48c8daa14da41fe244bf))
* Update import path for ConfigManager ([e87f101](https://github.com/zotoio/x-fidelity/commit/e87f10135d9afddd43ac145c6308ca1fd70d3fd7))
* Update import path for ConfigManager ([6a6b05a](https://github.com/zotoio/x-fidelity/commit/6a6b05af2dc9e217ae53d5f315116ffd565a2fad))
* Update ResultMetadata interface ([b95fab7](https://github.com/zotoio/x-fidelity/commit/b95fab7731d8040913b7fbd832b1589a31acef0b))
* Update telemetryCollector.test.ts to use mocked fs functions ([29d435d](https://github.com/zotoio/x-fidelity/commit/29d435dd24fc4cc01c07d2eecbebb43339474005))
* Update test case for loadRules function ([5b6278d](https://github.com/zotoio/x-fidelity/commit/5b6278d6323c576ac1b980f41cef78f683b3ae5d))
* Update test case to expect resolved value instead of rejection ([580108a](https://github.com/zotoio/x-fidelity/commit/580108ae927c00f17673f82125718ca8c4205493))
* Update test expectation for `analyzeCodebase` results ([bdafd3f](https://github.com/zotoio/x-fidelity/commit/bdafd3f3eaf5a70315e323dd9dfe2af1f82908be))
* Update test expectations for addOperator and addFact ([c86a33a](https://github.com/zotoio/x-fidelity/commit/c86a33a9042f234c5a934d0ff555af438ebaff1f))
* Update test expectations to match actual results structure ([3398a84](https://github.com/zotoio/x-fidelity/commit/3398a8433e5a543084c1dcaaf69dd910fae6d297))
* Update tests to expect new ResultMetadata structure ([fc16223](https://github.com/zotoio/x-fidelity/commit/fc162232c976f6638228a2e450a793ea7d087bb4))


### Features

* Add BasicTelemetryMetadata interface ([be87308](https://github.com/zotoio/x-fidelity/commit/be873084164d592822193cad70badeedd2fa17de))
* Add details on creating custom OpenAI rules ([80abb24](https://github.com/zotoio/x-fidelity/commit/80abb24652565bce89ce61bba16dc4de8c0f5654))
* add interface for the result of collectTelemetryData ([ea6089a](https://github.com/zotoio/x-fidelity/commit/ea6089a2a35b6445550adde1aa5c63ac1a701dc9))
* Add new CLI options and examples ([fab7b81](https://github.com/zotoio/x-fidelity/commit/fab7b81db053bcf144fb104b0bba82ff7679ab57))
* Add ResultMetadata interface ([08c3fe2](https://github.com/zotoio/x-fidelity/commit/08c3fe2f20bfac98ddb173ac482fb8f09a661780))
* Add telemetry reporting and improve error handling ([ac16e44](https://github.com/zotoio/x-fidelity/commit/ac16e4400197b59fa40384b3802f40dfe9bc5941))
* Expand OpenAI Integration section in README.md ([c4e34e7](https://github.com/zotoio/x-fidelity/commit/c4e34e7626c264b3972bfc28eaaff172bbba6295))
* Implement ConfigManager class to manage application configuration ([6836652](https://github.com/zotoio/x-fidelity/commit/6836652ce82791eaa85ddc1eb5a27d63dbaf9b4a))
* Refactor codebase analysis and reporting ([7f7d30e](https://github.com/zotoio/x-fidelity/commit/7f7d30e607bde3d29a68c4fcf42ecd0779029b24))
* Refactor ResultMetadata interface ([7d9ddf2](https://github.com/zotoio/x-fidelity/commit/7d9ddf2457b5d3d0981f66dcf07cd4ec03e79554))
* **system:** fixes, refactor, optimisations ([4da8c9f](https://github.com/zotoio/x-fidelity/commit/4da8c9f0d0dbc8b151ee01b21dfaab150ee02dfe))
* Update README with callout for OpenAI rule naming convention ([103a470](https://github.com/zotoio/x-fidelity/commit/103a4704213f417f30be0936965ae2d90b29ee75))


### BREAKING CHANGES

* **system:** some of the contract for cli has changed, and output interfaces updated

# [1.17.0](https://github.com/zotoio/x-fidelity/compare/v1.16.1...v1.17.0) (2024-08-16)


### Bug Fixes

* Add missing type definitions in src/rules/index.ts ([f9fc2f7](https://github.com/zotoio/x-fidelity/commit/f9fc2f7bde8ca7ef29a11f5576139b664a7d4575))
* Handle error when loading local archetype config ([a1bf9de](https://github.com/zotoio/x-fidelity/commit/a1bf9de6961d393f4e75cf56f4de978aef5a6e27))
* Return default config when unable to load local archetype config ([0934a71](https://github.com/zotoio/x-fidelity/commit/0934a712964275e22e553e8fca4c8f7f3ad1105c))
* Update `loadRules` function call in `src/core/engine/engineSetup.ts` ([3ffa9b0](https://github.com/zotoio/x-fidelity/commit/3ffa9b09cfc580302583ae858f2beec1e5f1f97b))
* Update ConfigManager.getConfig calls to use object parameter ([d9011ab](https://github.com/zotoio/x-fidelity/commit/d9011abb9282db7f0b2b5d27b30d12c31d612302))
* Update functions to use parameter objects defined in typedefs and ensure unit tests are updated accordingly ([0f5330a](https://github.com/zotoio/x-fidelity/commit/0f5330ab357f7bbd7584ca5a69457c8a7d8fdab6))
* Update loadRules function call in test ([3837151](https://github.com/zotoio/x-fidelity/commit/3837151f061c3b79f21464bf69d0b2dcc26f4ba2))
* Update test case for loadRules function ([5d6c08a](https://github.com/zotoio/x-fidelity/commit/5d6c08a6ddf072ec60f5a037b8b398470d8d5225))
* Update unit tests and files to use new GetConfigParams interface ([455691d](https://github.com/zotoio/x-fidelity/commit/455691de3deefd505e43f20b4a43047afdce5df2))


### Features

* Add type definition for OperatorDefn ([f9b09d5](https://github.com/zotoio/x-fidelity/commit/f9b09d51fe66f0f2f0cfa864c3f962ec508e35a4))
* update engine-related functions to use parameter objects ([9c76bc8](https://github.com/zotoio/x-fidelity/commit/9c76bc804fcea563260ee0fa0492674bfd77cd3b))
* Update functions to take parameter objects with types defined in typedefs ([dabcc2b](https://github.com/zotoio/x-fidelity/commit/dabcc2be18784e33fc82ac3c4ff95b05ff924077))

## [1.16.1](https://github.com/zotoio/x-fidelity/compare/v1.16.0...v1.16.1) (2024-08-16)


### Bug Fixes

* **dependencies:** ensure correct dir prefix ([5d3fcb3](https://github.com/zotoio/x-fidelity/commit/5d3fcb39faeb9ad13de9fe55e8ccb6645c260b0e))

# [1.16.0](https://github.com/zotoio/x-fidelity/compare/v1.15.0...v1.16.0) (2024-08-16)


### Bug Fixes

* Add missing mocks for fs module in config.test.ts ([3274a48](https://github.com/zotoio/x-fidelity/commit/3274a48bf6216f01f20e4d4ecf1922d98a9216cb))
* Add missing readFile mock to fs.promises in config.test.ts ([db4bfc0](https://github.com/zotoio/x-fidelity/commit/db4bfc0127c4af7f40bf35e5813ac33049c52773))
* Change log level from debug to info when initializing config manager ([c9c45f1](https://github.com/zotoio/x-fidelity/commit/c9c45f11de2934e1ecbaf40964a5f19dbdb0e901))
* Handle errors when loading local archetype config ([a4a97a4](https://github.com/zotoio/x-fidelity/commit/a4a97a4672024ac1f7ad972e257f8138afeda8d4))
* Handle missing configuration in ConfigManager ([667cfff](https://github.com/zotoio/x-fidelity/commit/667cfff654543f4942be834f3f2ae49611551649))
* Improve error handling in ConfigManager ([3743bcf](https://github.com/zotoio/x-fidelity/commit/3743bcf8b81e051894a31ccef102f39e93e89896))
* Mock archetypes in config.test.ts ([5738736](https://github.com/zotoio/x-fidelity/commit/5738736a3322578b210f90641fefa26cf90249af))
* Resolve issues with ConfigManager tests ([8fc2a8e](https://github.com/zotoio/x-fidelity/commit/8fc2a8ecdf0aee4e763f1d4d3d1780d4065a49b6))
* Resolve TypeScript errors in analyzer.ts ([5e231f5](https://github.com/zotoio/x-fidelity/commit/5e231f5daa2d2d95c9ff56c3cfbf881023cdd094))
* update `config` tests to match new implementation ([4350668](https://github.com/zotoio/x-fidelity/commit/4350668d6a15ea3f1ef09ebd4f021129c2bcf3c8))
* Update config.test.ts to use fs module correctly ([66823cc](https://github.com/zotoio/x-fidelity/commit/66823cc1734eeb2a18ffd7ca9c628ec9fed8c2b4))
* Update ConfigManager mock in engine.test.ts ([78e76c7](https://github.com/zotoio/x-fidelity/commit/78e76c786227079d5a5a537e98e0ca7346365ee6))
* Update ConfigManager tests ([2e7b73f](https://github.com/zotoio/x-fidelity/commit/2e7b73faebf3a3ad1f4339236d8758c45b984cf8))
* Update ConfigManager to use async getConfig method ([f95725f](https://github.com/zotoio/x-fidelity/commit/f95725f3a49ec906d574af62b42136a07e5ffe0c))
* Update ConfigManager usage in analyzer.ts ([3a9aaf0](https://github.com/zotoio/x-fidelity/commit/3a9aaf0c9fabd77d978fb5950d2c4acf94b4b50b))
* Update engineSetup.ts to use correct config server property ([b54f5fb](https://github.com/zotoio/x-fidelity/commit/b54f5fb95d0ca74de49ffff1041422a26fc6e7f7))
* Update import path for ConfigManager ([bed4610](https://github.com/zotoio/x-fidelity/commit/bed461063c6100583faaae577994f00965557c90))
* Update test case to expect correct error message ([a02d2df](https://github.com/zotoio/x-fidelity/commit/a02d2df458bed70c9d3cd5e3ef4c9f45232274b4))
* Update test case to expect resolved value instead of rejection ([ab3d704](https://github.com/zotoio/x-fidelity/commit/ab3d70492f1c7c555f28c6a90f4f1126c36fe8f8))
* Update test to match actual implementation ([3236978](https://github.com/zotoio/x-fidelity/commit/323697814cc4b782c0a82a21366813b1e309a79b))


### Features

* **config:** refactor and start to centralise ([d71e65b](https://github.com/zotoio/x-fidelity/commit/d71e65b7d0b88f47d91df8b05b9725c3a5e5f1df))
* Move ConfigManager to utils/config ([23a449c](https://github.com/zotoio/x-fidelity/commit/23a449c24a08adc0013471b9b4d494565ebc99b9))
* Refactor ConfigManager to use static methods and caching ([811975a](https://github.com/zotoio/x-fidelity/commit/811975af3a35e7ccda2343984c480da597faba6b))
* Rewrite config.test.ts to ensure mocks work and all features are exercised ([0fdbe11](https://github.com/zotoio/x-fidelity/commit/0fdbe11301692e2b3d451000a8c002accde81ce7))

# [1.15.0](https://github.com/zotoio/x-fidelity/compare/v1.14.0...v1.15.0) (2024-08-14)


### Features

* Add performance test script ([0097cfe](https://github.com/zotoio/x-fidelity/commit/0097cfe9d4849ac70a6501c871435d0ded821c2d))
* Add telemetry requests to the performance test and generate a report with graphs ([282af87](https://github.com/zotoio/x-fidelity/commit/282af87ea4af1e04d14ba6700b416c39077b21f9))
* Update artillery test YAML with more realistic payload sizes ([1dcb5e4](https://github.com/zotoio/x-fidelity/commit/1dcb5e42011fee66d8674864386767a18a605a2f))
* Update performance tests to use Artillery ([31ee453](https://github.com/zotoio/x-fidelity/commit/31ee4536609fb7369e850204bbeac67a9bebfb6b))


### Performance Improvements

* Add performance tests for the server ([33e3546](https://github.com/zotoio/x-fidelity/commit/33e3546a6d19a00dcc9851d91eee4dce9f2534d7))
* **rate-limit:** increase rate-limit and test intensity ([206bd5b](https://github.com/zotoio/x-fidelity/commit/206bd5ba46111aa41dac5144ea41946e85deadf0))

# [1.14.0](https://github.com/zotoio/x-fidelity/compare/v1.13.0...v1.14.0) (2024-08-13)


### Bug Fixes

* Add missing 'repoPath' property to metadata object in engineSetup.ts ([2ff3378](https://github.com/zotoio/x-fidelity/commit/2ff3378272fdf874bd422e18fbf5a34222ee065b))
* Remove duplicate `repoPath` property in `metadata` object ([a31341b](https://github.com/zotoio/x-fidelity/commit/a31341b45da33fb230a7f4057ea445ebfa4c0d22))
* Update loadRules function call in engine.test.ts ([aea43bb](https://github.com/zotoio/x-fidelity/commit/aea43bb894dd463941eecf2ed1301f77df847d28))
* Update loadRules function call in setupEngine ([b116048](https://github.com/zotoio/x-fidelity/commit/b1160489445e1c9ec043786c2c3528d04f2e9f91))
* Update telemetry data collection ([051a166](https://github.com/zotoio/x-fidelity/commit/051a166502e08ae82b1c36396850a61c9d457714))


### Features

* Add localConfigPath parameter to setupEngine function ([cbfff7a](https://github.com/zotoio/x-fidelity/commit/cbfff7aeecdf5af685dd248013f432f6a4c4df98))
* reorganize codebase for maintainability and consistency ([13a454d](https://github.com/zotoio/x-fidelity/commit/13a454d8383de0ca7647c4113b89939958061b31))

# [1.13.0](https://github.com/zotoio/x-fidelity/compare/v1.12.0...v1.13.0) (2024-08-13)


### Bug Fixes

* Add helmet dependency to improve security ([897fbe5](https://github.com/zotoio/x-fidelity/commit/897fbe5b76579e181ca091ccdb0bb3559beb0ad8))
* Add import for validateArchetypeWithLogging in src/core/engine.ts ([7e686ed](https://github.com/zotoio/x-fidelity/commit/7e686edf073a6488a52c2a7b62a2d12ed749fc94))
* Add JSON schema validation for archetypes and rules ([56e5857](https://github.com/zotoio/x-fidelity/commit/56e58571402560ee3560ee403db56b1c2b6fb70f))
* Add required property to minimumDependencyVersions object in archetypeSchema ([e253a04](https://github.com/zotoio/x-fidelity/commit/e253a04d21c1aa7d20bb4be2854d3c9587136653))
* Implement Helmet middleware for improved security headers ([79228a1](https://github.com/zotoio/x-fidelity/commit/79228a16bffa450fe571f548629cc4f385d6f960))
* Remove duplicate 'required' property in archetypeSchema ([004b914](https://github.com/zotoio/x-fidelity/commit/004b914270456662817b9e39ba5cbf5ada36f7d7))
* Remove unnecessary else blocks ([67e5789](https://github.com/zotoio/x-fidelity/commit/67e5789ea18c38b4661bb433e2b69028538fb779))
* Resolve TypeScript errors in configServer.test.ts ([cc84ffe](https://github.com/zotoio/x-fidelity/commit/cc84ffe7ea77116b600d57f33d2183c9b47745e1))
* update 'additionalProperties' in archetypeSchema ([8616c4b](https://github.com/zotoio/x-fidelity/commit/8616c4bc187d5dc9e38f70170f5bc058fe399c7c))
* update archetypeSchema additionalProperties type ([01a5f10](https://github.com/zotoio/x-fidelity/commit/01a5f108252ee2edf7b13af0f1556fce9c2c41b8))
* update archetypeSchema to use oneOf for standardStructure ([e2b10b6](https://github.com/zotoio/x-fidelity/commit/e2b10b65a39b9fb99766e7ac24d0d610daa8f2ff))
* Update JSON schema to allow any type for minimumDependencyVersions property ([6a07399](https://github.com/zotoio/x-fidelity/commit/6a073999db5366246fe725f22fc5614edfcd9989))
* Update mocking of validateArchetype and validateRule in configServer.test.ts ([818fb31](https://github.com/zotoio/x-fidelity/commit/818fb31f5b2058d06fee6cce8a1f4de81b47de6f))
* Update standardStructure schema in archetypeSchema ([0bf8551](https://github.com/zotoio/x-fidelity/commit/0bf8551b83e9ec7639a438eddb2dfa00518242d1))
* Validate input before processing requests ([83f6850](https://github.com/zotoio/x-fidelity/commit/83f6850fd54be771370a831733ab130fce719e14))


### Features

* Add additionalProperties constraint to archetypeSchema ([7ba52d6](https://github.com/zotoio/x-fidelity/commit/7ba52d61d1f05888d23aba1621fd7aa790d3b400))
* Add rate limiting to Express server ([b577ce0](https://github.com/zotoio/x-fidelity/commit/b577ce0a2af22f76b67c81e22a2c1093cb211125))
* add required property to archetypeSchema ([8624daf](https://github.com/zotoio/x-fidelity/commit/8624daf6d886890c22bb3b3e4202862b9d610019))
* Add support for additional properties in archetype schema ([6cc5433](https://github.com/zotoio/x-fidelity/commit/6cc54334c0f853aec2446bcd8323dcd621c50477))
* extend usage of joi to cover all user inputs, including query parameters and request bodies across all routes in `configServer.ts` ([5f8d3c6](https://github.com/zotoio/x-fidelity/commit/5f8d3c61288f82eef9bca7a442d74738bbd42738))
* Increase rate limiter window and max requests ([e0a913d](https://github.com/zotoio/x-fidelity/commit/e0a913d1e38c6f885b03b6000229c6535ade5aa7))
* optimize the jsonschema definition for archetype ([48b7188](https://github.com/zotoio/x-fidelity/commit/48b7188ea2c951c1c7c9071cf3189ebc403c6775))
* replace Joi with AJV for JSON schema validation ([e7582da](https://github.com/zotoio/x-fidelity/commit/e7582da938521a70f08ee8039d4c740eda1db673))
* **security:** jsonschema, joi input checks, http header safety, rate-limiting ([5ac07b3](https://github.com/zotoio/x-fidelity/commit/5ac07b30c2d813fef5019d92b6280ea69fd81fe7))
* Update JSON schema for archetypeConfig ([3ae2176](https://github.com/zotoio/x-fidelity/commit/3ae217609fbe60f67abd173929424e2fa30db664))

# [1.12.0](https://github.com/zotoio/x-fidelity/compare/v1.11.0...v1.12.0) (2024-08-13)


### Bug Fixes

* **docker:** tls ([ddc482c](https://github.com/zotoio/x-fidelity/commit/ddc482c36727bf8b2c5c070061856fa722caa870))


### Features

* Generate self-signed certificate and use it in Dockerfile ([9827ce4](https://github.com/zotoio/x-fidelity/commit/9827ce428cee13b437215068207bdc343320d484))
* Use environment variables for certificate path and archetype ([abc254e](https://github.com/zotoio/x-fidelity/commit/abc254e03f855f1caa7562c23059a5f1fb70bd11))
* Use environment variables in Dockerfile CMD and docker-compose.yml ([2278a68](https://github.com/zotoio/x-fidelity/commit/2278a683cd73924333b4baba75600de5dd49e9f8))

# [1.11.0](https://github.com/zotoio/x-fidelity/compare/v1.10.1...v1.11.0) (2024-08-13)


### Bug Fixes

* Add logging for cache operations in configServer ([caa6b28](https://github.com/zotoio/x-fidelity/commit/caa6b28d7071073b03005696e402dc46df9e0217))
* Improve caching and error handling in config server ([5adb358](https://github.com/zotoio/x-fidelity/commit/5adb3581c2d34871ac461d461c38deaf17c7e2d5))
* **server:** cachettl option fix ([ee85fe3](https://github.com/zotoio/x-fidelity/commit/ee85fe360d8ff6b496f048d9c93c8129532cc02c))


### Features

* Implement Joi for input validation ([f950b28](https://github.com/zotoio/x-fidelity/commit/f950b28e4549a7c753914ce9321d5d6813230b35))
* use Joi to validate input with alphanumeric, hyphen, and underscore characters, length between 1 and 50 ([8306f2f](https://github.com/zotoio/x-fidelity/commit/8306f2fa79f68e2ce38e906845f74cde9c0929c1))

## [1.10.1](https://github.com/zotoio/x-fidelity/compare/v1.10.0...v1.10.1) (2024-08-12)


### Bug Fixes

* **docker:** dockerfile based on latest npm release ([5a503a1](https://github.com/zotoio/x-fidelity/commit/5a503a1ae46cda54bd836c88ae8ea6e921277ea5))
* **server:** add working dockerfile and compose file examples ([2e19d48](https://github.com/zotoio/x-fidelity/commit/2e19d482f40138d8aff971f1d33423300d4ac33f))

# [1.10.0](https://github.com/zotoio/x-fidelity/compare/v1.9.0...v1.10.0) (2024-08-12)


### Bug Fixes

* Import RuleProperties from json-rules-engine ([9f312b6](https://github.com/zotoio/x-fidelity/commit/9f312b6687feb22e9cb5276bb412ef76959fdf9c))
* **logprefix and sec:** tracing, tls, masking, logic fixes ([7efc593](https://github.com/zotoio/x-fidelity/commit/7efc5934c7ca17964f83ba53f8584c9871a2c492))
* Update default server port to 8888 ([1ae67df](https://github.com/zotoio/x-fidelity/commit/1ae67df23f6db660c96411dc1c668407de23b88c))
* Update default TTL configuration in configServer ([babee16](https://github.com/zotoio/x-fidelity/commit/babee162e74468375266d80233eced76932216f6))
* Update type of `data` property in `ruleListCache` object ([63def63](https://github.com/zotoio/x-fidelity/commit/63def633d95e8603a3a68da57574700d52037eb5))
* Use generateLogPrefix to get the log prefix ([59fb55b](https://github.com/zotoio/x-fidelity/commit/59fb55b1d0f655ed3aedada0969c51eee752e936))


### Features

* Add CLI option for cache TTL ([fde1885](https://github.com/zotoio/x-fidelity/commit/fde1885697c9c9442117e163106a24808b1245e5))
* add config server URL from header ([40e8390](https://github.com/zotoio/x-fidelity/commit/40e83906872dea2534e480c4662b32b9078dbe68))
* Add logPrefix parameter to ConfigManager initialization ([fb675c3](https://github.com/zotoio/x-fidelity/commit/fb675c39fe931d2ce26b7e136fc243e871fd53ab))
* Add request log prefix to API endpoints ([ffbf74e](https://github.com/zotoio/x-fidelity/commit/ffbf74e1f195910ad26c1880e6b11460eb63b01b))
* add test for error when unable to load local archetype config ([61d4e43](https://github.com/zotoio/x-fidelity/commit/61d4e43946f26e3b5e05c84cc0da8fbf0195ed09))
* Cache the archetype lists and rule lists ([89f260a](https://github.com/zotoio/x-fidelity/commit/89f260af41a4dea68653594f259f30057d568516))
* Enhance sensitive data detection in logging rule ([ff9281d](https://github.com/zotoio/x-fidelity/commit/ff9281d4521db005fd66d0a4c837459663da70a2))
* ensure consistent log prefix for telemetry calls ([a4f182b](https://github.com/zotoio/x-fidelity/commit/a4f182bc0f0baa787031b11c397328b0f412c159))
* Implement caching for archetype and rule JSON files in the config server ([e3e077b](https://github.com/zotoio/x-fidelity/commit/e3e077b518ec38899d0ef6418486225031bf167d))
* update config tests to expect error when unable to load from configServer ([4d96bdf](https://github.com/zotoio/x-fidelity/commit/4d96bdf2c868f8453d8b48bd84dc5583b4c6822f))
* Use TLS for the config server ([ef5a7a2](https://github.com/zotoio/x-fidelity/commit/ef5a7a22e8ef7697b212363a1bf3c156187416d7))

# [1.9.0](https://github.com/zotoio/x-fidelity/compare/v1.8.0...v1.9.0) (2024-08-06)


### Bug Fixes

* **config:** local paths and config option resolutions ([52a8144](https://github.com/zotoio/x-fidelity/commit/52a81448eab3376f063f867b0ab476fbfc0e210f))


### Features

* add support for relative and absolute paths in directory and local-config options ([c67f0fe](https://github.com/zotoio/x-fidelity/commit/c67f0fe802139d9b4422cfb77bf0ed46e820f73a))

# [1.8.0](https://github.com/zotoio/x-fidelity/compare/v1.7.0...v1.8.0) (2024-08-01)


### Features

* Add system architecture diagram to README.md ([ce80b79](https://github.com/zotoio/x-fidelity/commit/ce80b795031c366b232e51c0cf0e651fa77c364c))

# [1.7.0](https://github.com/zotoio/x-fidelity/compare/v1.6.1...v1.7.0) (2024-07-30)


### Features

* **extensibility:** archtypes as replacable json files and docs ([ce7b06d](https://github.com/zotoio/x-fidelity/commit/ce7b06df4b3ae76c4d5094b478e7425579b585b2))

## [1.6.1](https://github.com/zotoio/x-fidelity/compare/v1.6.0...v1.6.1) (2024-07-27)


### Bug Fixes

* **lint:** setup ([f559331](https://github.com/zotoio/x-fidelity/commit/f5593314bc591cb2d6e8cb809c828455fa294b62))

# [1.6.0](https://github.com/zotoio/x-fidelity/compare/v1.5.1...v1.6.0) (2024-07-27)


### Bug Fixes

* **telemetry:** option silent ([e72b366](https://github.com/zotoio/x-fidelity/commit/e72b36603d4a682fee993a330393f453926a187a))


### Features

* **config:** local filesystem config, openai option, telemetry option ([16f481c](https://github.com/zotoio/x-fidelity/commit/16f481cbb5c5e2fefd1b7cfcc6e9371461609f85))

## [1.5.1](https://github.com/zotoio/x-fidelity/compare/v1.5.0...v1.5.1) (2024-07-25)


### Bug Fixes

* **scope:** logging correlation ([ea1c497](https://github.com/zotoio/x-fidelity/commit/ea1c4977cac418c49cd9f6778e7f72458c2c2a61))

# [1.5.0](https://github.com/zotoio/x-fidelity/compare/v1.4.1...v1.5.0) (2024-07-24)


### Bug Fixes

* **logger:** console transport ([69c62b1](https://github.com/zotoio/x-fidelity/commit/69c62b1b9859bc71801c576b969e9698ecc53a61))
* **log:** remove console and add process exit codes ([3ec801f](https://github.com/zotoio/x-fidelity/commit/3ec801fe3f913452d1f6ef14723fd0f8cb3a8439))


### Features

* **telemetry:** basic start ([47faf3b](https://github.com/zotoio/x-fidelity/commit/47faf3b5f7a88afc07be1b256a611ce46ef64872))
* **telemetry:** basics including tracing ([f07f6b4](https://github.com/zotoio/x-fidelity/commit/f07f6b4d7ad886008cd20d3ccfa80e0e980bfd34))
* **telemetry:** request ids ([e19489e](https://github.com/zotoio/x-fidelity/commit/e19489eadd08b06119244a8e1798c2f22bac898b))

## [1.4.1](https://github.com/zotoio/x-fidelity/compare/v1.4.0...v1.4.1) (2024-07-14)


### Bug Fixes

* **rules:** change default sensitive strings rule ([3e14e24](https://github.com/zotoio/x-fidelity/commit/3e14e248cc8ae95a6a79a7f3d5f75b3db6f9d35f))

# [1.4.0](https://github.com/zotoio/x-fidelity/compare/v1.3.0...v1.4.0) (2024-07-14)


### Features

* **rule:** report specific dependency issues ([2ccaf6c](https://github.com/zotoio/x-fidelity/commit/2ccaf6cfe9d6cf8a73de5413fffee40dbb0f236d))

# [1.3.0](https://github.com/zotoio/x-fidelity/compare/v1.2.0...v1.3.0) (2024-07-11)


### Bug Fixes

* **ai:** fix ([8f94cee](https://github.com/zotoio/x-fidelity/commit/8f94cee6ef990a39db3bc4c61f16b3c56bdb10dd))
* **ai:** fix ([f5ba9f5](https://github.com/zotoio/x-fidelity/commit/f5ba9f5319e02788f3c6a1f0b70b1fa2638e719d))
* Initialized OpenAI client before using it to prevent "Cannot read properties of undefined (reading 'chat')" error ([a112b43](https://github.com/zotoio/x-fidelity/commit/a112b4372ff7eef5c00cb4c3fede13eeb932b2a2))
* **refactor:** logic issues and async issue ([2ad8cdd](https://github.com/zotoio/x-fidelity/commit/2ad8cdd7becbd80217dd0115be266cdf753a8470))
* **sec:** prevent error reflection ([93eca93](https://github.com/zotoio/x-fidelity/commit/93eca93e4737f01977f27dacf8cabbd5adf1ab2b))
* **sec:** santize input ([6f78c39](https://github.com/zotoio/x-fidelity/commit/6f78c396a6d83189d3985a0c826f5967e1e6eee4))
* **server:** fix ai error ([20341fa](https://github.com/zotoio/x-fidelity/commit/20341fa0df7a34791f2a4f34a89ee1cf7e5014ef))


### Features

* **server:** remote config server ([f027ed2](https://github.com/zotoio/x-fidelity/commit/f027ed200d94e0bc16c000a8a677da819a8695cf))

# [1.2.0](https://github.com/zotoio/x-fidelity/compare/v1.1.0...v1.2.0) (2024-07-10)


### Bug Fixes

* **filedata:** update collection and filtering ([d463a2b](https://github.com/zotoio/x-fidelity/commit/d463a2bdc24f7904954f1c955403189393f1071a))
* **tests:** add tests and fix logic issues uncovered ([e33975a](https://github.com/zotoio/x-fidelity/commit/e33975a76122b17ed86eb7152e61599b63f4da03))


### Features

* **archetypes:** initial archetype test ([7970a3e](https://github.com/zotoio/x-fidelity/commit/7970a3e07889fd4e492c02c326e91c5b3cc09bf8))

# [1.1.0](https://github.com/zotoio/x-fidelity/compare/v1.0.0...v1.1.0) (2024-07-05)


### Features

* **openai:** experiment and tidy ([fd38f73](https://github.com/zotoio/x-fidelity/commit/fd38f738820b4f11660150022b1b3595ea49521d))
* **openai:** testing ([1518710](https://github.com/zotoio/x-fidelity/commit/1518710a3f11edfb1b2de0151fe16713163b8425))

# 1.0.0 (2024-06-15)


### Bug Fixes

* **access:** cd ([0016364](https://github.com/zotoio/x-fidelity/commit/0016364e94ca5175f46c76487363970f4378ada0))
* **ascii:** readme fix ([86a4448](https://github.com/zotoio/x-fidelity/commit/86a444809f502ac60aad7076fb09b3674a32750a))
* **ci:** branch name ([858a3cd](https://github.com/zotoio/x-fidelity/commit/858a3cd1f0f0290fed88ce70806e96eff65ecd69))
* **ci:** node version ([8da6d00](https://github.com/zotoio/x-fidelity/commit/8da6d004eb73109daaad9c867a4aaec35a30a17f))
* **config:** release ([ccf103c](https://github.com/zotoio/x-fidelity/commit/ccf103cfafdedd1c4bbf17ed2829bcc5392c7ab8))
* **deps:** missing ([367c43e](https://github.com/zotoio/x-fidelity/commit/367c43e356b50560edfcace2b212c685d4a59033))
* **pipeline:** test ([ee4a098](https://github.com/zotoio/x-fidelity/commit/ee4a0988ddf7f235fde6a454f86905b6c15ea6cf))
* **release bin:** local install and cd ([750ab7a](https://github.com/zotoio/x-fidelity/commit/750ab7a7a71163709fde331ca17c8b17895223f2))
* **test:** merge ([603ebc5](https://github.com/zotoio/x-fidelity/commit/603ebc58c930da0b2d8bdb465a457a02cfdbb28a))
* **trigger:** cd ([c039356](https://github.com/zotoio/x-fidelity/commit/c039356ecd2d64724411b9333adb7078ab17a2b8))


### Features

* **pipelines:** setup gh actions ([ceca83a](https://github.com/zotoio/x-fidelity/commit/ceca83a2d0ea604dfb93a71d5a85fef4ffd8c6e7))
