import { SnsWasmCanister } from '@dfinity/nns';
import { Principal } from '@dfinity/principal';
import { initSnsWrapper } from '@dfinity/sns';
import { generateImage, loadJSON } from './helpers.js';
import {
  fetchTokensFromGc,
  updateTokenListJson,
  TOKEN_LOGO_PATH,
  FAUCET_TOKEN_PATH
} from './helpers.js';

const ICP_SYMBOL = 'ICP';
const MAINNET_SNS_WASM_CANISTER_ID = Principal.fromText(
  'qaa6y-5yaaa-aaaaa-aaafa-cai'
);

const TokensJson = loadJSON('./tokenlist.json');

class TokenListUpdater {
  static async create() {
    const snsTokens = await this.getSnsTokens();
    const snsTokensWithLogos = await this.generateSnsTokenLogos(snsTokens);
    this.updateTokenListFile(snsTokensWithLogos);
    await this.getEvmFaucetTokens();
  }

  static async generateSnsTokenLogos(snsTokens) {
    console.log('snsTokens', snsTokens);
    const promises = snsTokens
      .filter((sns) => sns && sns.symbol)
      .map((sns) => {
        return (async () => {
          const imageName = `${sns.symbol.toLowerCase()}.png`;
          const logoPath = `logos/${imageName}`;
          if (sns?.logo) {
            await generateImage(sns.logo, logoPath);
          }
          return {
            ...sns,
            logo: `${TOKEN_LOGO_PATH}${imageName}`
          };
        })();
      });
    const results = (await Promise.allSettled(promises)).map((v) => {
      if (v.status === 'fulfilled') {
        console.log('v.value', v.value);
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

    console.log('mainnetTokens', mainnetTokens);

    updateTokenListJson(mainnetTokens, './tokenlist.json');
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
  static async getEvmFaucetTokens() {
    const faucetTokens = await fetchTokensFromGc();
    const data = {
      name: 'Bitfinity Faucet Tokens',
      tokens: [...faucetTokens]
    };
    updateTokenListJson(data, FAUCET_TOKEN_PATH);
  }
}

TokenListUpdater.create();
