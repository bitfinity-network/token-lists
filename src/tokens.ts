import { SnsWasmCanister } from '@dfinity/nns';
import axios from 'axios';
import TokensJson from './tokenlist.json';
import TestnetTokensJson from './tokenlist.testnet.json';
import { HttpAgent } from '@dfinity/agent';
import { initSnsWrapper } from '@dfinity/sns';
import { Principal } from '@dfinity/principal';
import { isDefined } from './utils';

const IC_API_BASE_URL = 'https://ic-api.internetcomputer.org';

export interface CanisterInfo {
  canisterId: string;
  controllers: string[];
  wasmHash: string;
  subnetId: string;
}

export interface TokenProperties {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  fee: number;
  standard: string;
  tags?: string[];
  index_canister?: string;
  canisterInfo?: CanisterInfo;
  logo?: string;
}

export type JsonnableToken = TokenProperties;

export interface JsonableTokenList {
  name: string;
  tokens: TokenProperties[];
}

export type Envs = 'testnet' | 'mainnet';

export interface TokenListCreateOptions {
  env?: Envs;
  host?: string;
  snsWasmCanisterId?: Principal;
}

const MAINNET_SNS_WASM_CANISTER_ID = Principal.fromText(
  'qaa6y-5yaaa-aaaaa-aaafa-cai'
);

export class Token {
  id: Principal;
  name: string;
  fee: number;
  symbol: string;
  decimals: number;
  standard: string;
  indexCanister?: Principal;
  tags?: string[];
  canisterInfo?: CanisterInfo;
  logo?: string;

  constructor(props: TokenProperties) {
    this.id = Principal.fromText(props.id);
    this.name = props.name;
    this.fee = props.fee;
    this.symbol = props.symbol;
    this.decimals = props.decimals;
    this.standard = props.standard;
    this.tags = props.tags;
    this.canisterInfo = props.canisterInfo;
    this.indexCanister = props.index_canister
      ? Principal.fromText(props.index_canister)
      : undefined;
    this.logo = props.logo;
  }

  get wasmHash() {
    return this.canisterInfo?.wasmHash;
  }
  get controllers() {
    return this.canisterInfo?.controllers;
  }

  async getCanisterInfo(): Promise<CanisterInfo> {
    const url = `${IC_API_BASE_URL}/api/v3/canisters/${this.id.toText()}`;
    const { data } = await axios.get(url);
    const {
      canister_id: canisterId,
      module_hash: wasmHash,
      subnet_id: subnetId,
      controllers
    } = data;
    return { canisterId, wasmHash, subnetId, controllers };
  }

  static fromJSON(json: string | JsonnableToken): Token {
    let token;

    if (typeof json === 'string') {
      token = JSON.parse(json);
    } else {
      token = json;
    }

    return new this(token);
  }

  toJSON(): JsonnableToken {
    return {
      id: this.id.toText(),
      name: this.name,
      fee: this.fee,
      symbol: this.symbol,
      decimals: this.decimals,
      standard: this.standard,
      tags: this.tags,
      index_canister: this.indexCanister?.toText(),
      canisterInfo: this.canisterInfo,
      logo: this.logo
    };
  }
}

export class TokenList {
  name: string;
  tokens: Token[];

  constructor(name: string, tokens: Token[]) {
    this.name = name;
    this.tokens = tokens;
  }

  static async create({
    env,
    host,
    snsWasmCanisterId
  }: TokenListCreateOptions = {}): Promise<TokenList> {
    let tokensJson: JsonableTokenList = TokensJson;
    let snsWasmId = snsWasmCanisterId;
    let snsTokens: Token[] = [];

    if (env === 'testnet') {
      tokensJson = TestnetTokensJson;
    }
    if (snsWasmCanisterId) {
      snsWasmId = snsWasmCanisterId || MAINNET_SNS_WASM_CANISTER_ID;
      snsTokens = await this.getSnsTokens({
        host,
        snsWasmCanisterId: snsWasmId
      });
    }
    const tokens = tokensJson.tokens.map((token) => Token.fromJSON(token));

    return new this(tokensJson.name, [...tokens, ...snsTokens]);
  }

  static async getSnsTokens({
    host,
    snsWasmCanisterId
  }: {
    host?: string;
    snsWasmCanisterId?: Principal;
  } = {}) {
    const agent = host ? new HttpAgent({ host }) : undefined;
    const snsWasm = SnsWasmCanister.create({
      agent,
      canisterId: snsWasmCanisterId
    });

    const snses = await snsWasm.listSnses({});
    const promises = snses.map<Promise<TokenProperties>>((sns) => {
      return (async () => {
        const tokenMeta: Partial<TokenProperties> = {
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

        return tokenMeta as TokenProperties;
      })();
    });

    const results = (await Promise.allSettled<TokenProperties>(promises)).map(
      (v) => {
        if (v.status === 'fulfilled') {
          return v.value;
        }
        return;
      }
    );
    const snsTokens: TokenProperties[] = results.filter(isDefined);
    return snsTokens.map((t) => Token.fromJSON(t));
  }

  static fromJSON(json: string | JsonableTokenList): TokenList {
    let tokenList: JsonableTokenList;
    if (typeof json === 'string') {
      tokenList = JSON.parse(json);
    } else {
      tokenList = json;
    }

    const tokens = tokenList.tokens.map((token) => Token.fromJSON(token));
    return new this(tokenList.name, tokens);
  }
}
