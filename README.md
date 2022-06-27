## TOKEN LIST

This package includes a JSON schema for Infinityswap's token lists, and TypeScript utilities for working with these token lists.

The JSON schema represents the technical specification for a token list that are supported on the Infinityswap platform.
Current token standard supported are IS20, ICP....
Any addition of a token to this list gets validated against the JSON schema in the CI.  

JSON Schema $id
The JSON schema ID is https://infinityswap.one/tokenlist.schema.json


### USAGE
```js
import { TokenList } from '@infinityswap/token-list'

function usage() {

  # get currently listed tokens
  const list = await TokenList.create()

  # select TNK1 from the list
  const tkn1 = list.find(token => token.symbol === 'TKN1');
  
  # access TKN1 metadata
  tkn1.principal;
  tkn1.name;
  tkn1.symbol;
  # ...etc


  # Load TKN1 canister specific info
  await tkn1.getCanisterInfo();
  
  # access info such as wasm hash, canister controllers
  tnk1.wasmHash;
  tkn1.controllers;
  
}
```


