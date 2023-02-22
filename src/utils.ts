import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import MainnetTokenList from './tokenlist.json';
import schema from './tokenlist.schema.json';
import { JsonableTokenList, Token } from './tokens';

export async function validate(tokenList: JsonableTokenList) {
  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  const valid = validator(tokenList);
  if (valid) {
    return valid;
  }

  if (validator.errors) {
    throw validator.errors.map((error) => {
      delete error.data;
      return error;
    });
  }

  return false;
}

export async function validateTokensObject(tokens: Token[]) {
  if (MainnetTokenList.tokens.length) {
    const mainnetSampleToken = Token.fromJSON(MainnetTokenList.tokens[0]);
    let valid = true;
    const sampleObjKeys = Object.keys(mainnetSampleToken).sort();
    for (const token of tokens) {
      if (
        JSON.stringify(Object.keys(token).sort()) !==
        JSON.stringify(sampleObjKeys)
      ) {
        valid = false;
        break;
      }
    }
    return valid;
  }
  return false;
}

export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
