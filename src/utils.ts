import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './tokenlist.schema.json';
import { JsonableTokenList } from './tokens';

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


export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined;
}
