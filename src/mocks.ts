import * as FetchMock from 'fetch-mock';
import XHRMock, { delay as xhrMockDelay, proxy } from 'xhr-mock';
import { parse } from 'query-string';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface MockConfig {
  allowXHRPassthrough?: boolean;
  allowFetchPassthrough?: boolean;
}

export interface Mock {
  url: RegExp;
  method: HttpMethod;
  response: object;
  responseCode?: number;
  responseHeaders?: Record<string, string>;
  delay?: number;
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

  mocks.forEach(
    ({
      method,
      url,
      response,
      responseCode = 200,
      responseHeaders,
      delay = 0
    }) => {
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
          FetchMock.delete(
            url,
            () => addDelay(delay).then(() => finalResponse),
            {
              overwriteRoutes: false
            }
          );
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
