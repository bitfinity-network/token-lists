import { SnsWasmCanister } from '@dfinity/nns';
import axios from 'axios';
import TokensJson from './tokenlist.json';
import TestnetTokensJson from './tokenlist.testnet.json';
import { HttpAgent } from '@dfinity/agent';
import { initSnsWrapper } from '@dfinity/sns';
import { Principal } from '@dfinity/principal';
import { isDefined } from './utils';

const IC_API_BASE_URL = 'https://ic-api.internetcomputer.org';

interface CanisterInfo {
  canisterId: string;
  controllers: string[];
  wasmHash: string;
  subnetId: string;
}

interface TokenProperties {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  fee: number;
  standard: string;
  index_canister?: string;
  canisterInfo?: CanisterInfo;
}

type JsonnableToken = TokenProperties;

export interface JsonableTokenList {
  name: string;
  tokens: TokenProperties[];
}

type Envs = 'testnet' | 'mainnet';

interface TokenListCreateOptions {
  env?: Envs;
  host?: string;
  snsWasmCanisterId?: Principal;
}

const MAINNET_SNS_WASM_CANISTER_ID = Principal.fromText(
  'qaa6y-5yaaa-aaaaa-aaafa-cai'
);

export class Token {
  private _id: Principal;
  private _name: string;
  private _fee: number;
  private _symbol: string;
  private _decimals: number;
  private _standard: string;
  private _canisterInfo?: CanisterInfo;

  constructor(props: TokenProperties) {
    this._id = Principal.fromText(props.id);
    this._name = props.name;
    this._fee = props.fee;
    this._symbol = props.symbol;
    this._decimals = props.decimals;
    this._standard = props.standard;
    this._canisterInfo = props.canisterInfo;
  }

  get name() {
    return this._name;
  }

  get id() {
    return this._id;
  }

  get symbol() {
    return this._symbol;
  }

  get decimals() {
    return this._decimals;
  }

  get fee() {
    return this._decimals;
  }

  get standard() {
    return this._standard;
  }

  get wasmHash() {
    return this._canisterInfo?.wasmHash;
  }
  get controllers() {
    return this._canisterInfo?.controllers;
  }

  async getCanisterInfo(): Promise<CanisterInfo> {
    const url = `${IC_API_BASE_URL}/api/v3/canisters/${this._id}`;
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
      id: this._id.toText(),
      name: this._name,
      fee: this._fee,
      symbol: this._symbol,
      decimals: this._decimals,
      standard: this._standard,
      canisterInfo: this._canisterInfo
    };
  }
}

export class TokenList {
  private _name: string;
  private _tokens: Token[];

  constructor(name: string, tokens: Token[]) {
    this._name = name;
    this._tokens = tokens;
  }

  get name() {
    return this._name;
  }

  get tokens() {
    return this._tokens;
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
    } else {
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

        const [, snsTokenMeta] = await snsWrapper.metadata({});
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
