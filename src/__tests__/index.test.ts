import { validate } from '../utils';
import TestnetTokenList from '../tokenlist.testnet.json';

describe('Validate testnet token list', () => {
  test('the token list should be valid', async () => {
    await expect(validate(TestnetTokenList)).resolves.toBe(true);
  });
});
