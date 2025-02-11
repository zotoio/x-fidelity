# Interface: PluginRegistry

> **Note**: This interface outlines the x‐fidelity plugin registry, which manages registration and execution of plugin functions. It is central to extending the tool with custom plugins.

Defined in: [../../src/types/typeDefs.ts:292](https://github.com/zotoio/x-fidelity/blob/749b04f14475849294420145101445f325608e85/src/types/typeDefs.ts#L292)

## Properties

### executePluginFunction()

> **executePluginFunction**: (`pluginName`, `functionName`, ...`args`) => [`PluginResult`](PluginResult.md)

Defined in: [../../src/types/typeDefs.ts:296](https://github.com/zotoio/x-fidelity/blob/749b04f14475849294420145101445f325608e85/src/types/typeDefs.ts#L296)

#### Parameters

##### pluginName

`string`

##### functionName

`string`

##### args

...`any`[]

#### Returns

[`PluginResult`](PluginResult.md)

***

### getPluginFacts()

> **getPluginFacts**: () => [`FactDefn`](../type-aliases/FactDefn.md)[]

Defined in: [../../src/types/typeDefs.ts:294](https://github.com/zotoio/x-fidelity/blob/749b04f14475849294420145101445f325608e85/src/types/typeDefs.ts#L294)

#### Returns

[`FactDefn`](../type-aliases/FactDefn.md)[]

***

### getPluginOperators()

> **getPluginOperators**: () => [`OperatorDefn`](../type-aliases/OperatorDefn.md)[]

Defined in: [../../src/types/typeDefs.ts:295](https://github.com/zotoio/x-fidelity/blob/749b04f14475849294420145101445f325608e85/src/types/typeDefs.ts#L295)

#### Returns

[`OperatorDefn`](../type-aliases/OperatorDefn.md)[]

***

### registerPlugin()

> **registerPlugin**: (`plugin`) => `void`

Defined in: [../../src/types/typeDefs.ts:293](https://github.com/zotoio/x-fidelity/blob/749b04f14475849294420145101445f325608e85/src/types/typeDefs.ts#L293)

#### Parameters

##### plugin

[`XFiPlugin`](XFiPlugin.md)

#### Returns

`void`
