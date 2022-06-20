import { Certificate, HttpAgent, getDefaultAgent } from '@dfinity/agent';
import TokenJson from './tokenlist.json';
import encoding from 'text-encoding';
import { Buffer } from 'buffer';

interface TokenProperties {
  principal: string;
  name: string;
  symbol: string;
  decimals: number;
  standard: string;
}

type JsonnableToken = TokenProperties;

export class Token {
  private _principal: string;
  private _name: string;
  private _symbol: string;
  private _decimals: number;
  private _standard: string;

  constructor(props: TokenProperties) {
    this._principal = props.principal;
    this._name = props.name;
    this._symbol = props.symbol;
    this._decimals = props.decimals;
    this._standard = props.standard;
  }

  get name() {
    return this._name;
  }

  get principal() {
    return this._principal;
  }

  get symbol() {
    return this._symbol;
  }

  get decimals() {
    return this._decimals;
  }

  get standard() {
    return this._standard;
  }

  async wasmHash(agent?: HttpAgent): Promise<string> {
    const actualAgent = agent ?? getDefaultAgent();

    const path = [
      new encoding.TextEncoder().encode('canister'),
      new encoding.TextEncoder().encode(this._principal),
      new encoding.TextEncoder().encode('module_hash')
    ];

    const state = await actualAgent.readState(this._principal, {
      paths: [path]
    });

    const cert = new Certificate(state, agent);
    const verified = await cert.verify();
    if (!verified) {
      throw new Error('Failed to verify certificate');
    }
    const rawHash = cert.lookup(path);
    
    let hash = '';
    if (rawHash) {
      hash = Buffer.from(rawHash).toString('hex');
    }
    return hash;
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
}

interface JsonableTokenList {
  name: string;
  tokens: TokenProperties[];
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

  static create(): TokenList {
    const tokens = TokenJson.tokens.map((token) => Token.fromJSON(token));
    return new this(TokenJson.name, tokens);
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
