# Class: ConfigManager

Defined in: [src/core/configManager.ts:15](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/core/configManager.ts#L15)

## Constructors

### new ConfigManager()

> **new ConfigManager**(): [`ConfigManager`](ConfigManager.md)

#### Returns

[`ConfigManager`](ConfigManager.md)

## Methods

### clearLoadedConfigs()

> `static` **clearLoadedConfigs**(): `void`

Defined in: [src/core/configManager.ts:24](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/core/configManager.ts#L24)

#### Returns

`void`

***

### getConfig()

> `static` **getConfig**(`params`): `Promise`\<[`ExecutionConfig`](../interfaces/ExecutionConfig.md)\>

Defined in: [src/core/configManager.ts:30](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/core/configManager.ts#L30)

#### Parameters

##### params

[`GetConfigParams`](../interfaces/GetConfigParams.md)

#### Returns

`Promise`\<[`ExecutionConfig`](../interfaces/ExecutionConfig.md)\>

***

### getLoadedConfigs()

> `static` **getLoadedConfigs**(): `string`[]

Defined in: [src/core/configManager.ts:20](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/core/configManager.ts#L20)

#### Returns

`string`[]

***

### loadPlugins()

> `static` **loadPlugins**(`extensions`?): `Promise`\<`void`\>

Defined in: [src/core/configManager.ts:38](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/core/configManager.ts#L38)

#### Parameters

##### extensions?

`string`[]

#### Returns

`Promise`\<`void`\>
