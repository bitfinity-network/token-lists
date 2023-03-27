import axios from 'axios';
import dotenv from 'dotenv';
import { FAUCET_TOKEN_URL, HEADERS_CONFIG, TOKEN_LOGO_PATH } from './contants.js';
dotenv.config();
import { updateTokenListJson } from './helpers.js';

const tokenFilePath =
  process.env.IC_ENVIRON === 'testnet'
    ? './evm.tokenlist.testnet.json'
    : './evm.tokenlist.json';


const fetchTokensFromGc = async () => {
  try {
    const response = await axios.get(FAUCET_TOKEN_URL, {
      headers: HEADERS_CONFIG
    });
    const tokens = [];
    Object.keys(response.data.tokens).forEach((i) => {
      tokens.push({
        ...response.data.tokens[i],
        logo: `${TOKEN_LOGO_PATH}${i}.png`
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