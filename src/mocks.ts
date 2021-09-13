import fetchMock from 'fetch-mock';
import XHRMock, { delay as xhrMockDelay, proxy } from 'xhr-mock';
import { parse } from 'query-string';
import { Server as MockServer } from 'mock-socket';
import {
  Scenarios,
  MockConfig,
  Mock,
  HttpMock,
  GraphQLMock,
  Operation,
  WebSocketMock,
} from './types';

/**
 * Gets the corresponding value for `scenario` key in the browser's Location object.
 */
export const extractScenarioFromLocation = (location: Location): string => {
  const { scenario = 'default' } = parse(location.search);
  if (Array.isArray(scenario)) {
    throw new Error('Only one scenario may be used at a time');
  }
  return scenario;
};

/**
 * Orchestrator for setting up mocks.
 */
export const injectMocks = (
  scenarios: Scenarios,
  scenario: keyof Scenarios = 'default',
  config?: MockConfig
): void => {
  XHRMock.setup();

  fetchMock.config.fallbackToNetwork = config?.allowFetchPassthrough ?? false;
  fetchMock.config.warnOnFallback =
    config?.disableConsoleWarningsForFetch ?? true;

  const mocks: Mock[] =
    scenario !== 'default'
      ? reduceAllMocksForScenario(scenarios, scenario)
      : scenarios.default;

  if (!mocks || mocks.length === 0) {
    throw new Error('Unable to instantiate mocks');
  }

  const restMocks = mocks.filter(
    (m) => !['GRAPHQL', 'WEBSOCKET'].includes(m.method)
  ) as HttpMock[];
  const graphQLMocks = mocks.filter(
    (m) => m.method === 'GRAPHQL'
  ) as GraphQLMock[];

  const webSocketMocks = mocks.filter(
    (m) => m.method === 'WEBSOCKET'
  ) as WebSocketMock[];

  restMocks.forEach(handleRestMock);
  graphQLMocks.forEach(handleGraphQLMock);
  webSocketMocks.forEach(handleWebsocketMock);

  if (config?.allowXHRPassthrough) {
    XHRMock.use(proxy);
  }
};

/**
 * Returns all mocks for a given scenarios + everything in the default mocks
 * that don't have a matching scenario mock.
 */
export const reduceAllMocksForScenario = (
  scenarios: Scenarios,
  scenario: keyof Scenarios
): Mock[] => {
  if (scenario === 'default') {
    return scenarios.default;
  }

  const defaultMocks = scenarios.default;
  const scenarioMocks = scenarios[scenario];

  if (!scenarioMocks) {
    throw new Error(`No mocks found for scenario '${scenario}'`);
  }

  const mocks = defaultMocks.concat(scenarioMocks);

  const initialHttpMocks = mocks.filter(
    (m) => !['GRAPHQL', 'WEBSOCKET'].includes(m.method)
  ) as HttpMock[];
  const initialGraphQlMocks = mocks.filter(
    ({ method }) => method === 'GRAPHQL'
  ) as GraphQLMock[];

  const initialWebsocketMocks = mocks.filter(
    (m) => m.method === 'WEBSOCKET'
  ) as WebSocketMock[];

  const websocketMocksByUrl = initialWebsocketMocks.reduce<
    Record<string, WebSocketMock>
  >((result, mock) => {
    const { url } = mock;
    result[url] = mock;
    return result;
  }, {});

  const httpMocksByUrlAndMethod = initialHttpMocks.reduce<
    Record<string, HttpMock>
  >((result, mock) => {
    const { url, method } = mock;
    // Always take the latest mock
    result[`${url.toString()}${method}`] = mock;

    return result;
  }, {});
  const httpMocks = Object.values(httpMocksByUrlAndMethod);

  const graphQlMocksByUrlAndOperations = initialGraphQlMocks.reduce<
    Record<
      string,
      { operationsByNameAndType: Record<string, Operation>; url: RegExp }
    >
  >((result, mock) => {
    const { url, operations } = mock;

    const operationsByNameAndType: Record<string, Operation> =
      result[url.toString()]?.operationsByNameAndType ?? {};

    operations.forEach((operation) => {
      // Always take the latest operation
      operationsByNameAndType[
        `${operation.operationName}${operation.type}`
      ] = operation;
    });

    result[url.toString()] = {
      url,
      operationsByNameAndType,
    };
    return result;
  }, {});
  const graphQlMocks = Object.values(graphQlMocksByUrlAndOperations).map(
    ({ url, operationsByNameAndType }) => {
      return {
        method: 'GRAPHQL',
        url,
        operations: Object.values(operationsByNameAndType),
      };
    }
  ) as GraphQLMock[];

  const websocketMocks = Object.values(websocketMocksByUrl);

  return [...httpMocks, ...graphQlMocks, ...websocketMocks];
};

/**
 * Mocks the right HTTP method for a REST mock.
 */
function handleRestMock({
  method,
  url,
  response,
  responseCode = 200,
  responseHeaders,
  delay = 0,
}: HttpMock) {
  const finalResponse = {
    body: response,
    status: responseCode,
    headers: responseHeaders,
  };
  switch (method) {
    case 'GET':
      fetchMock.get(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false,
      });
      XHRMock.get(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'POST':
      fetchMock.post(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false,
      });
      XHRMock.post(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'PUT':
      fetchMock.put(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false,
      });
      XHRMock.put(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'PATCH':
      fetchMock.patch(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false,
      });
      XHRMock.patch(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'DELETE':
      fetchMock.delete(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false,
      });
      XHRMock.delete(url, xhrMockDelay(finalResponse, delay));
      break;
    default:
      throw new Error(
        `Unrecognised HTTP method ${method} - please check your mock configuration`
      );
  }
}

/**  const graphQLMocks = mocks.filter(ethod for a GraphQL mock.
 */
function handleGraphQLMock({ url, operations }: GraphQLMock) {
  const graphQLErrorResponse = { errors: [] };
  const findOperation = (operationName: string) =>
    operations.find((o) => o.operationName === operationName);
  const findOperationPost = (postBody) => {
    const jsonBody =
      typeof postBody === 'string' ? JSON.parse(postBody) : postBody;
    return findOperation(jsonBody.operationName);
  };
  const delayedResponse = (
    delay: number | undefined,
    response: object | string
  ) => {
    return addDelay(delay ? delay : 0).then(() => response);
  };

  fetchMock.get(url, (u) => {
    const parsedUrl = new URL(u);
    const operationName = parsedUrl.searchParams.get('operationName') || '';
    const operation = findOperation(operationName);

    if (!operation || operation?.type === 'mutation') {
      return graphQLErrorResponse;
    }

    const finalResponse = {
      body: operation.response,
      status: operation.responseCode,
      headers: operation.responseHeaders,
    };

    return delayedResponse(operation.delay, finalResponse);
  });

  fetchMock.post(
    url,
    (_, { body }) => {
      const operation = findOperationPost(body);

      if (!operation) {
        return graphQLErrorResponse;
      }

      const finalResponse = {
        body: operation.response,
        status: operation.responseCode,
        headers: operation.responseHeaders,
      };

      return delayedResponse(operation.delay, finalResponse);
    },
    {
      overwriteRoutes: false,
    }
  );

  XHRMock.get(url, (req, res) => {
    const operationName = req.url().query?.operationName || '';
    const operation = findOperation(operationName);

    if (!operation || operation?.type === 'mutation') {
      return res.body(graphQLErrorResponse);
    }

    const { response, responseCode, responseHeaders, delay } = operation;
    if (responseHeaders) {
      res.headers(responseHeaders);
    }
    return addDelay(delay ? delay : 0).then(() => {
      return res.status(responseCode ?? 200).body(response);
    });
  });

  XHRMock.post(url, (req, res) => {
    const operation = findOperationPost(req.body());

    if (!operation) {
      return res.body(graphQLErrorResponse);
    }

    const { response, responseCode, responseHeaders, delay } = operation;
    if (responseHeaders) {
      res.headers(responseHeaders);
    }
    return addDelay(delay ? delay : 0).then(() =>
      res.status(responseCode ?? 200).body(response)
    );
  });
}

const handleWebsocketMock = ({ url, server }: WebSocketMock) => {
  console.log('makeing, ', url);
  server(new MockServer(url));
};

/**
 * Adds delay (in ms) before resolving a promise.
 */
const addDelay = (delay: number) =>
  new Promise((res) => setTimeout(res, delay));
