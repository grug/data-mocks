export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type MockConfig = {
  allowXHRPassthrough?: boolean;
  allowFetchPassthrough?: boolean;
};

export type HttpMock = {
  url: RegExp;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
  method: HttpMethod;
  response: object | string;
};

export type GraphQLMock = {
  url: RegExp;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
  method: 'GRAPHQL';
  operations: Array<Operation>;
};

export type Operation = {
  type: 'query' | 'mutation';
  name: string;
  response: object;
};

export type Mock = HttpMock | GraphQLMock;

export type Scenarios = {
  default: Mock[];
  [scenario: string]: Mock[];
};
