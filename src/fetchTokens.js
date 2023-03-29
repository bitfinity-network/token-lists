import axios from 'axios';
import icrc1IDL from './ic/idl/icrc1.did.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import fetch, { Headers } from 'node-fetch';
global.fetch = fetch;
global.Headers = Headers;
import dotenv from 'dotenv';
import { loadJSON, updateTokenListJson } from './helpers.js';
import { HEADERS_CONFIG } from './constants.js';
dotenv.config();

const tokenFilePath =
  process.env.IC_ENVIRON === 'testnet'
    ? './tokenlist.testnet.json'
    : './tokenlist.json';

const TokensJson = loadJSON(tokenFilePath);

const updateTokenList = (tokens) => {
  tokens.forEach((token) => {
    const foundIndex = TokensJson.tokens.findIndex((i) => i.id === token.id);
    if (foundIndex >= 0) {
      TokensJson.tokens[foundIndex] = {
        ...TokensJson.tokens[foundIndex],
        ...token
      };
    } else {
      TokensJson.tokens.push(token);
    }
  });

  updateTokenListJson(TokensJson, tokenFilePath);
};

const fetchTokenIdsFromEvmCanister = async () => {
  try {
    const response = await axios.post(
      process.env.IC_HTTP,
      {
        jsonrpc: '2.0',
        method: 'ic_getTokens',
        params: [],
        id: 1
      },
      {
        headers: HEADERS_CONFIG
      }
    );
    return response.data.result.map((i) => ({
      principal: i.ic_token.principal,
      standard: i.ic_token.standard
    }));
  } catch (error) {
    console.log(error);
  }
};

const fetchMetadata = async (tokenData) => {
  const agent = new HttpAgent({
    host: process.env.IC_HOST
  });
  if (process.env.IC_ENVIRON === 'local') {
    await agent.fetchRootKey();
  }

  const promises = tokenData.map((i) => {
    return (async () => {
      const meta = { id: i.principal };
      const actor = Actor.createActor(icrc1IDL, {
        agent,
        canisterId: i.principal
      });
      const data = await actor.icrc1_metadata();
      data.forEach((entry) => {
        const [first, second] = entry;
        if (first.includes('decimals')) {
          meta.decimals = Number(second.Nat);
        } else if (first.includes('symbol')) {
          meta.symbol = second.Text;
        } else if (first.includes('name')) {
          meta.name = second.Text;
        } else if (first.includes('fee')) {
          meta.fee = Number(second.Nat);
        }
      });
      meta.standard = i.standard;
      return meta;
    })();
  });

  const data = await Promise.all(promises);
  return data;
};

(async () => {
  const tokenData = await fetchTokenIdsFromEvmCanister();
  const tokens = await fetchMetadata(tokenData);
  updateTokenList(tokens);
})();
