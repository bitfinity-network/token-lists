import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const tokenFilePath =
  process.env.IC_ENVIRON === 'local' || process.env.IC_ENVIRON === 'testnet'
    ? './evm.tokenlist.json'
    : './evm.tokenlist.testnet.json';

const FAUCET_TOKEN_URL =
  'https://storage.googleapis.com/evmc/Addresses/logs/tokenAddresses.json';

const updateTokenListJson = async (data, path) => {
  fs.writeFile(
    new URL(path, import.meta.url),
    JSON.stringify(data),
    function (err) {
      if (err) throw err;
      console.log('complete');
    }
  );
};

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
      console.log(i);
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