import * as FetchMock from 'fetch-mock';
import { parse } from 'query-string';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Mock {
  url: RegExp;
  method: HttpMethod;
  response: object;
  responseCode?: number;
  delay?: number;
}

export interface Scenarios {
  default: Mock[];
  [scenario: string]: Mock[];
}

export const extractScenarioFromLocation = (location: Location): string => {
  return parse(location.search).scenario
    ? parse(location.search).scenario
    : 'default';
};

export const injectMocks = (
  scenarios: Scenarios,
  scenario: keyof Scenarios = 'default'
): void => {
  const mocks: Mock[] =
    scenario !== 'default'
      ? reduceAllMocksForScenario(scenarios, scenario)
      : scenarios.default;

  if (!mocks || mocks.length === 0) {
    throw new Error('Unable to instantiate mocks');
  }

  mocks.forEach(({ method, url, response, responseCode = 200, delay = 0 }) => {
    const finalResponse = {
      body: response,
      status: responseCode
    };

    switch (method) {
      case 'GET':
        FetchMock.get(url, () => addDelay(delay).then(() => finalResponse));
        break;
      case 'POST':
        FetchMock.post(url, () => addDelay(delay).then(() => finalResponse));
        break;
      case 'PUT':
        FetchMock.put(url, () => addDelay(delay).then(() => finalResponse));
        break;
      case 'DELETE':
        FetchMock.delete(url, () => addDelay(delay).then(() => finalResponse));
        break;
      default:
        throw new Error(
          `Unrecognised HTTP method ${method} - please check your mock configuration`
        );
    }
  });
};

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

  return defaultMocks.concat(scenarioMocks).reduce(
    (acc, mock) => {
      const scenarioSpecificMockIndex = findMockIndexInScenarioByMatcher(
        scenarioMocks,
        mock.url
      );
      const isScenarioSpecificMockPresent = scenarioSpecificMockIndex >= 0;

      isScenarioSpecificMockPresent
        ? acc.push(scenarios[scenario][scenarioSpecificMockIndex])
        : acc.push(mock);

      return acc;
    },
    [] as Mock[]
  );
};

const addDelay = (delay: number) => new Promise(res => setTimeout(res, delay));

const findMockIndexInScenarioByMatcher = (
  scenario: Mock[],
  matcher: RegExp
): number => scenario.findIndex(mock => mock.url === matcher);
