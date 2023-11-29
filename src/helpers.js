import fs from 'fs';
import * as relativePath from 'path';
import axios from 'axios';

export const FAUCET_TOKEN_URL =
  'https://storage.googleapis.com/evmc/Addresses/logs/tokenAddresses.json';
export const TOKEN_LOGO_PATH =
  'https://raw.githubusercontent.com/infinity-swap/token-lists/main/logos/';

export const HEADERS_CONFIG = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};
export const FAUCET_TOKEN_PATH = './evm.tokenlist.testnet.json';

export const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf-8'));

export const updateTokenListJson = async (
  data,
  path,
  base = import.meta.url
) => {
  const newPath = new URL(path, base);
  fs.writeFile(newPath, JSON.stringify(data), null, function (err) {
    if (err) throw err;
    console.log('complete');
  });
};

export const __dirname = relativePath
  .dirname(import.meta.url)
  .split('/')
  .slice(0, -1)
  .join('/');

export const generateImage = async (base64String, path) => {
  let base64Image = base64String.split(';base64,').pop();
  fs.writeFile(
    new URL(path, __dirname + '/'),
    base64Image,
    { encoding: 'base64', recursive: true },
    function () {
      console.log('File created');
    }
  );
};

export const fetchTokensFromGc = async () => {
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
