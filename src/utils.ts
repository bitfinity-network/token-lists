import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import tokenList from './tokenlist.json';
import schema from './tokenlist.schema.json';

export async function validate() {
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
