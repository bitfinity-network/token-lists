import fs from 'fs';
import axios from 'axios';
import icrc1IDL from './ic/idl/icrc1.did.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import fetch from 'node-fetch';
global.fetch = fetch;
import dotenv from 'dotenv';
dotenv.config();

const tokenFilePath = process.env.IC_ENVIRON === 'local' || process.env.IC_ENVIRON === 'testnet'
? './tokenlist.testnet.json'
: './tokenlist.json'

const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));

const TokensJson = loadJSON(tokenFilePath);

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

const updateTokenList = (tokens) => {
  tokens.forEach((token) => {
    const foundIndex = TokensJson.tokens.findIndex((i) => i.id === token.id);
    if (foundIndex >= 0) {
      TokensJson.tokens[foundIndex] = { ...TokensJson.tokens[foundIndex], ...token };
    } else {
      TokensJson.tokens.push(token);
    }
  })

  updateTokenListJson(TokensJson, tokenFilePath);
}

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
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.result.map((i) => i.ic_token.principal);
  } catch (error) {
    console.log(error);
  }
};

const fetchMetadata = async (tokenIds) => {
  const agent = new HttpAgent({
    host: process.env.IC_HOST
  });
  if (process.env.IC_ENVIRON === 'local') {
    await agent.fetchRootKey();
  }

  const promises = tokenIds.map((i) => {
    return (async () => {
      const meta = { id: i };
      const actor = Actor.createActor(icrc1IDL, {
        agent,
        canisterId: i
      });
      const data = await actor.icrc1_metadata();
      data.forEach((entry) => {
        if (entry[0].includes('decimals')) {
          meta.decimals = Number(entry[1].Nat);
        } else if (entry[0].includes('symbol')) {
          meta.symbol = entry[1].Text;
        } else if (entry[0].includes('name')) {
          meta.name = entry[1].Text;
        } else if (entry[0].includes('fee')) {
          meta.fee = Number(entry[1].Nat);
        }
      });

      return meta;
    })();
  });

  const data = await Promise.all(promises);
  return data;
};

(async () => {
  const tokenIds = await fetchTokenIdsFromEvmCanister();
  const tokens = await fetchMetadata(tokenIds);
  updateTokenList(tokens);
})();
