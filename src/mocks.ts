import * as FetchMock from 'fetch-mock/src/client';
import XHRMock, { delay as xhrMockDelay, proxy } from 'xhr-mock';
import { parse } from 'query-string';
import {
  Scenarios,
  MockConfig,
  Mock,
  HttpMock,
  GraphQLMock,
  Operation
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

  if (config && config.allowFetchPassthrough) {
    FetchMock.config.fallbackToNetwork = true;
  }

  const mocks: Mock[] =
    scenario !== 'default'
      ? reduceAllMocksForScenario(scenarios, scenario)
      : scenarios.default;

  if (!mocks || mocks.length === 0) {
    throw new Error('Unable to instantiate mocks');
  }

  const restMocks = mocks.filter(m => m.method !== 'GRAPHQL') as HttpMock[];
  const graphQLMocks = mocks.filter(
    m => m.method === 'GRAPHQL'
  ) as GraphQLMock[];

  restMocks.forEach(handleRestMock);
  graphQLMocks.forEach(handleGraphQLMock);

  if (config && config.allowXHRPassthrough) {
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
    ({ method }) => method !== 'GRAPHQL'
  ) as HttpMock[];
  const initialGraphQlMocks = mocks.filter(
    ({ method }) => method === 'GRAPHQL'
  ) as GraphQLMock[];

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
    Record<string, Record<string, Operation>>
  >((result, mock) => {
    const { url, operations } = mock;

    const operationsByNameAndType: Record<string, Operation> = result[
      url.toString()
    ]
      ? result[url.toString()]
      : {};

    operations.forEach(operation => {
      // Always take the latest operation
      operationsByNameAndType[
        `${operation.operationName}${operation.type}`
      ] = operation;
    });

    result[url.toString()] = operationsByNameAndType;
    return result;
  }, {});
  const graphQlMocks = Object.entries(graphQlMocksByUrlAndOperations).map(
    ([url, operationsByName]) => {
      return {
        method: 'GRAPHQL',
        url: RegExp(url.replace(/^\/(.*)\/$/, '$1')),
        operations: Object.values(operationsByName)
      };
    }
  ) as GraphQLMock[];

  return (httpMocks as any).concat(graphQlMocks);
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
  delay = 0
}: HttpMock) {
  const finalResponse = {
    body: response,
    status: responseCode,
    headers: responseHeaders
  };

  switch (method) {
    case 'GET':
      FetchMock.get(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false
      });
      XHRMock.get(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'POST':
      FetchMock.post(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false
      });
      XHRMock.post(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'PUT':
      FetchMock.put(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false
      });
      XHRMock.put(url, xhrMockDelay(finalResponse, delay));
      break;
    case 'DELETE':
      FetchMock.delete(url, () => addDelay(delay).then(() => finalResponse), {
        overwriteRoutes: false
      });
      XHRMock.delete(url, xhrMockDelay(finalResponse, delay));
      break;
    default:
      throw new Error(
        `Unrecognised HTTP method ${method} - please check your mock configuration`
      );
  }
}

/**
 * Mocks the right HTTP method for a GraphQL mock.
 */
function handleGraphQLMock({ url, operations }: GraphQLMock) {
  const graphQLErrorResponse = { errors: [] };
  const findMockGet = (u: string) => {
    const parsedUrl = new URL(u);
    const operationName = parsedUrl.searchParams.get('operationName');
    return operations.find(o => o.operationName === operationName);
  };
  const findMockPost = postBody => {
    const jsonBody =
      typeof postBody === 'string' ? JSON.parse(postBody) : postBody;
    return operations.find(
      ({ operationName }) => operationName === jsonBody.operationName
    );
  };
  const delayedResponse = (
    delay: number | undefined,
    response: object | string
  ) => {
    return addDelay(delay ? delay : 0).then(() => response);
  };

  FetchMock.get(url, u => {
    const mock = findMockGet(u);

    if (!mock || (mock && mock.type === 'mutation')) {
      return graphQLErrorResponse;
    }

    const finalResponse = {
      body: mock.response,
      status: mock.responseCode,
      headers: mock.responseHeaders
    };

    return delayedResponse(mock.delay, finalResponse);
  });

  FetchMock.post(
    url,
    (_, { body }) => {
      const mock = findMockPost(body);

      if (!mock) {
        return graphQLErrorResponse;
      }

      const finalResponse = {
        body: mock.response,
        status: mock.responseCode,
        headers: mock.responseHeaders
      };

      return delayedResponse(mock.delay, finalResponse);
    },
    {
      overwriteRoutes: false
    }
  );
}

/**
 * Adds delay (in ms) before resolving a promise.
 */
const addDelay = (delay: number) => new Promise(res => setTimeout(res, delay));
