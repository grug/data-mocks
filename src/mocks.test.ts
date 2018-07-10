import { injectMocks, HttpMethod, Scenarios, extractScenarioFromLocation, reduceAllMockForScenario, Mock } from './mocks';
import * as FetchMock from 'fetch-mock';

declare var jsdom: any;

describe('data-mocks', () => {
  describe('HTTP methods', () => {
    const httpMethods: HttpMethod[] = [
      'GET',
      'POST',
      'PUT',
      'DELETE'
    ];

    httpMethods.forEach(httpMethod => {
      const scenarios: Scenarios = {
        default: [
          { url: /foo/, method: httpMethod, response: {}, responseCode: 200 },
          { url: /bar/, method: httpMethod, response: {}, responseCode: 200 }
        ]
      };
      test(`Mocks calls for ${httpMethod}`, () => {
        const spy = jest.spyOn(FetchMock, httpMethod.toLowerCase() as any);

        injectMocks(scenarios, 'default');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy.mock.calls[0][0]).toEqual(/foo/);
        expect(spy.mock.calls[1][0]).toEqual(/bar/);
      });
    });
  });

  describe('Scenarios', () => {
    const scenarios: Scenarios = {
      default: [
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: {}, responseCode: 200 }
      ],
      someScenario: [
        { url: /bar/, method: 'GET', response: { some: 'otherResponse' }, responseCode: 401 },
        { url: /baz/, method: 'POST', response: {}, responseCode: 200 }
      ]
    };
    test(`Can extract the scenario from a URL`, () => {
      jsdom.reconfigure({
        url: 'https://www.foo.com?scenario=someScenario'
      });
      const scenario = extractScenarioFromLocation(location);
      expect(scenario).toEqual('someScenario');
    });

    test(`Can create a list for the default scenario`, () => {
      const result = reduceAllMockForScenario(scenarios, 'default');

      expect(result).toEqual([
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: {}, responseCode: 200 }
      ]);
    });

    test(`Can create a list of mocks for a specific scenario`, () => {
      const result = reduceAllMockForScenario(scenarios, 'someScenario');

      expect(result).toEqual([
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: { some: 'otherResponse' }, responseCode: 401 },
        { url: /baz/, method: 'POST', response: {}, responseCode: 200 }
      ]);
    });

  });
})
