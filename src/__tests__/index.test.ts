import { validate, validateTokensObject } from '../utils';
import MainnetTokenList from '../tokenlist.json';
import TestnetTokenList from '../tokenlist.testnet.json';
import { TokenList } from '../index';

describe('Validate token lists', () => {
  test('the mainnet token list should be valid', async () => {
    await expect(validate(MainnetTokenList)).resolves.toBe(true);
  });

  test('the testnet token list should be valid', async () => {
    await expect(validate(TestnetTokenList)).resolves.toBe(true);
  });

  test('the mainnet tokens from create Tokenlist should be valid', async () => {
    const list = await TokenList.create({ env: 'mainnet' });
    await expect(list).toStrictEqual(new TokenList(list.name, list.tokens));
    await expect(validateTokensObject(list.tokens)).resolves.toBe(true);
  });

  test('the testnet tokens from create Tokenlist should be valid', async () => {
    const list = await TokenList.create({ env: 'testnet' });
    await expect(list).toStrictEqual(new TokenList(list.name, list.tokens));
    await expect(validateTokensObject(list.tokens)).resolves.toBe(true);
  });
});
