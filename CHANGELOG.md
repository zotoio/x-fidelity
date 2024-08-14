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
