import { SnsWasmCanister } from '@dfinity/nns';
import { Principal } from '@dfinity/principal';
import { initSnsWrapper } from '@dfinity/sns';
import * as relativePath from 'path';
import fs from 'fs';

const __dirname = relativePath
  .dirname(import.meta.url)
  .split('/')
  .slice(0, -1)
  .join('/');

const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));

const ICP_SYMBOL = 'ICP';
const MAINNET_SNS_WASM_CANISTER_ID = Principal.fromText(
  'qaa6y-5yaaa-aaaaa-aaafa-cai'
);

const TokensJson = loadJSON('./tokenlist.json');

const generateImage = async (base64String, path) => {
  let base64Image = base64String.split(';base64,').pop();
  fs.writeFile(
    new URL(path, __dirname + '/'),
    base64Image,
    { encoding: 'base64', recursive: true },
    function (err) {
      console.log('File created');
    }
  );
};

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

class TokenList {
  static async create() {
    const snsTokens = await this.getSnsTokens();
    const snsTokensWithLogos = await this.generateSnsTokenLogos(snsTokens);
    this.updateTokenListFile(snsTokensWithLogos);
  }
  static async generateSnsTokenLogos(snsTokens) {
    const promises = snsTokens.map((sns) => {
      return (async () => {
        let logoPath = `logos/${sns.symbol.toLowerCase()}.png`;
        if (sns?.logo) {
          await generateImage(sns.logo, logoPath);
        }
        return {
          ...sns,
          logo: `https://raw.githubusercontent.com/infinity-swap/token-lists/main/${logoPath}`
        };
      })();
    });
    const results = (await Promise.allSettled(promises)).map((v) => {
      if (v.status === 'fulfilled') {
        return v.value;
      }
      return;
    });
    return results;
  }
  static async updateTokenListFile(snsTokens) {
    const icpToken = TokensJson.tokens.find(
      (token) => token.name.toLowerCase() === ICP_SYMBOL.toLowerCase()
    );
    const mainnetTokens = {
      name: TokensJson.name,
      tokens: [icpToken, ...snsTokens]
    };

    updateTokenListJson(mainnetTokens, 'tokenlist.json');
  }
  static async getSnsTokens() {
    const agent = undefined;
    const snsWasm = SnsWasmCanister.create({
      agent,
      canisterId: MAINNET_SNS_WASM_CANISTER_ID
    });
    const snses = await snsWasm.listSnses({});
    const promises = snses.map((sns) => {
      return (async () => {
        const tokenMeta = {
          id: sns.ledger_canister_id[0]?.toText(),
          index_canister: sns.index_canister_id[0]?.toText()
        };

        const [snsRootCanisterId] = sns.root_canister_id;
        if (!snsRootCanisterId) {
          throw new Error('root_canister_id not found sns entry');
        }

        const snsWrapper = await initSnsWrapper({
          rootOptions: {
            canisterId: snsRootCanisterId
          },
          agent
        });

        const [snsMeta, snsTokenMeta] = await snsWrapper.metadata({});
        tokenMeta.logo = snsMeta.logo[0];
        snsTokenMeta.forEach(([key, val]) => {
          if (key.includes('decimals') && 'Nat' in val) {
            tokenMeta.decimals = Number(val.Nat);
          } else if (key.includes('symbol') && 'Text' in val) {
            tokenMeta.symbol = val.Text;
          } else if (key.includes('name') && 'Text' in val) {
            tokenMeta.name = val.Text;
          } else if (key.includes('fee') && 'Nat' in val) {
            tokenMeta.fee = Number(val.Nat);
          }
          tokenMeta.standard = 'ICRC1';
        });

        return tokenMeta;
      })();
    });
    const results = (await Promise.allSettled(promises)).map((v) => {
      if (v.status === 'fulfilled') {
        return v.value;
      }
      return;
    });
    return results;
  }
}

TokenList.create();
