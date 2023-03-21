import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import { updateTokenListJson } from './helpers.js';

const tokenFilePath =
  process.env.IC_ENVIRON === 'testnet'
    ? './evm.tokenlist.testnet.json'
    : './evm.tokenlist.json';

const FAUCET_TOKEN_URL =
  'https://storage.googleapis.com/evmc/Addresses/logs/tokenAddresses.json';

const fetchTokensFromGc = async () => {
  try {
    const response = await axios.get(FAUCET_TOKEN_URL, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    const tokens = [];
    Object.keys(response.data.tokens).forEach((i) => {
      tokens.push({
        ...response.data.tokens[i],
        logo: `https://raw.githubusercontent.com/infinity-swap/token-lists/main/logos/${i}.png`
      });
    });
    return tokens;
  } catch (error) {
    console.log(error);
  }
};

(async () => {
  const faucetTokens = await fetchTokensFromGc();
  updateTokenListJson(
    {
      name: 'InfinitySwap Faucet Tokens',
      tokens: faucetTokens
    },
    tokenFilePath
  );
})();