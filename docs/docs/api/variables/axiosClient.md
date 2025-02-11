# Variable: axiosClient

> `const` **axiosClient**: `object`

Defined in: [src/utils/axiosClient.ts:29](https://github.com/zotoio/x-fidelity/blob/f39ce89f1db3ea0cfe6f222cf6cc7fcd78a94dca/src/utils/axiosClient.ts#L29)

## Type declaration

### delete()

> **delete**: \<`T`\>(`url`, `config`?) => `Promise`\<`AxiosResponse`\<`T`, `any`\>\>

#### Type Parameters

• **T** = `any`

#### Parameters

##### url

`string`

##### config?

`AxiosRequestConfig`\<`any`\>

#### Returns

`Promise`\<`AxiosResponse`\<`T`, `any`\>\>

### get()

> **get**: \<`T`\>(`url`, `config`?) => `Promise`\<`AxiosResponse`\<`T`, `any`\>\>

#### Type Parameters

• **T** = `any`

#### Parameters

##### url

`string`

##### config?

`AxiosRequestConfig`\<`any`\>

#### Returns

`Promise`\<`AxiosResponse`\<`T`, `any`\>\>

### post()

> **post**: \<`T`\>(`url`, `data`?, `config`?) => `Promise`\<`AxiosResponse`\<`T`, `any`\>\>

#### Type Parameters

• **T** = `any`

#### Parameters

##### url

`string`

##### data?

`any`

##### config?

`AxiosRequestConfig`\<`any`\>

#### Returns

`Promise`\<`AxiosResponse`\<`T`, `any`\>\>

### put()

> **put**: \<`T`\>(`url`, `data`?, `config`?) => `Promise`\<`AxiosResponse`\<`T`, `any`\>\>

#### Type Parameters

• **T** = `any`

#### Parameters

##### url

`string`

##### data?

`any`

##### config?

`AxiosRequestConfig`\<`any`\>

#### Returns

`Promise`\<`AxiosResponse`\<`T`, `any`\>\>
