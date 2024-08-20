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
