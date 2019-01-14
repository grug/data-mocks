import { get, post, put, delete as d } from 'fetch-mock';
import XHRMock, { delay as xhrMockDelay, proxy } from 'xhr-mock';
import { parse } from 'query-string';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface MockConfig {
  allowXHRPassthrough: boolean;
}

export interface Mock {
  url: RegExp;
  method: HttpMethod;
  response: object;
  responseCode?: number;
  delay?: number;
  headers?: {
    [header: string]: any;
  };
}

export interface Scenarios {
  default: Mock[];
  [scenario: string]: Mock[];
}

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

  if (config && config.allowXHRPassthrough) {
    XHRMock.use(proxy);
  }

  const mocks: Mock[] =
    scenario !== 'default'
      ? reduceAllMocksForScenario(scenarios, scenario)
      : scenarios.default;

  if (!mocks || mocks.length === 0) {
    throw new Error('Unable to instantiate mocks');
  }

  mocks.forEach(
    ({ method, url, response, headers, responseCode = 200, delay = 0 }) => {
      const finalResponse = {
        body: response,
        status: responseCode
      };

      switch (method) {
        case 'GET':
          get(url, () => addDelay(delay).then(() => finalResponse), {
            overwriteRoutes: headers ? false : true,
            ...(headers ? { headers } : {})
          });
          XHRMock.get(url, xhrMockDelay(finalResponse, delay));
          break;
        case 'POST':
          post(url, () => addDelay(delay).then(() => finalResponse), {
            overwriteRoutes: headers ? false : true,
            ...(headers ? { headers } : {})
          });
          XHRMock.post(url, xhrMockDelay(finalResponse, delay));
          break;
        case 'PUT':
          put(url, () => addDelay(delay).then(() => finalResponse), {
            overwriteRoutes: headers ? false : true,
            ...(headers ? { headers } : {})
          });
          XHRMock.put(url, xhrMockDelay(finalResponse, delay));
          break;
        case 'DELETE':
          d(url, () => addDelay(delay).then(() => finalResponse), {
            overwriteRoutes: headers ? false : true,
            ...(headers ? { headers } : {})
          });
          XHRMock.delete(url, xhrMockDelay(finalResponse, delay));
          break;
        default:
          throw new Error(
            `Unrecognised HTTP method ${method} - please check your mock configuration`
          );
      }
    }
  );
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

  return defaultMocks
    .filter(
      d =>
        !scenarioMocks.find(
          s => s.url.toString() === d.url.toString() && d.method === s.method
        )
    )
    .concat(scenarioMocks);
};

/**
 * Adds delay (in ms) before resolving a promise.
 */
const addDelay = (delay: number) => new Promise(res => setTimeout(res, delay));
