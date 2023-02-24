import { validate, validateTokensObject } from '../utils';
import MainnetTokenList from '../tokenlist.json';
import TestnetTokenList from '../tokenlist.testnet.json';
import { CanisterInfo, JsonnableToken, TokenList } from '../index';

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

  test('toJSON should return an object of type TokenProperties', async () => {
    const list = await TokenList.create({ env: 'mainnet' });
    console.log(list.tokens[0].toJSON());
    await expect(list.tokens[0].toJSON()).toMatchObject<
      Partial<JsonnableToken>
    >({
      id: expect.any(String),
      name: expect.any(String),
      fee: expect.any(Number),
      symbol: expect.any(String),
      decimals: expect.any(Number),
      standard: expect.any(String),
      index_canister: expect.anything(),
      tags: expect.any(Array),
      canisterInfo: expect.anything() as CanisterInfo,
      logo: expect.any(String)
    });
  });
});
