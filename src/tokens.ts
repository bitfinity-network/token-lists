import axios from 'axios';
import TokensJson from './tokenlist.json';
import TestnetTokensJson from './tokenlist.testnet.json';

const IC_API_BASE_URL = 'https://ic-api.internetcomputer.org';
const TOKENLIST_URL =
  'https://raw.githubusercontent.com/infinity-swap/token-lists/main/src/tokenlist.json';
const TESTNET_TOKENLIST_URL =
  'https://raw.githubusercontent.com/infinity-swap/token-lists/main/src/tokenlist.json';

interface TokenListJson {
  name: string;
  tokens: Token[];
}

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
  canisterInfo?: CanisterInfo;
}

type JsonnableToken = TokenProperties;

export interface JsonableTokenList {
  name: string;
  tokens: TokenProperties[];
}

export class Token {
  private _id: string;
  private _name: string;
  private _fee: number;
  private _symbol: string;
  private _decimals: number;
  private _standard: string;
  private _canisterInfo?: CanisterInfo;

  constructor(props: TokenProperties) {
    this._id = props.id;
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
      id: this._id,
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

  static async create(env: 'testnet' | 'prod'): Promise<TokenList> {
    let url = TOKENLIST_URL;
    let json: JsonableTokenList = TokensJson;
    if (env === 'testnet') {
      url = TESTNET_TOKENLIST_URL;
      json = TestnetTokensJson;
    }

    const { data } = await axios.get<TokenListJson>(url);

    const tokens = data.tokens.map((token) => Token.fromJSON(token));

    return new this(json.name, tokens);
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
