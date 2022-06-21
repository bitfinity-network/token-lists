import { validate } from '../utils';

describe('Validate token list', () => {
  test('the token list should be valid', async () => {
    await expect(validate()).resolves.toBe(true);
  })
})

