import { validate } from '../utils';
import MainnetTokenList from '../tokenlist.json';
import TestnetTokenList from '../tokenlist.testnet.json';

describe('Validate token lists', () => {
  test('the mainnet token list should be valid', async () => {
    await expect(validate(MainnetTokenList)).resolves.toBe(true);
  });

  test('the testnet token list should be valid', async () => {
    await expect(validate(TestnetTokenList)).resolves.toBe(true);
  });
});
