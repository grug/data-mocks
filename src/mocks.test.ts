import { injectMocks, HttpMethod, Scenarios, extractScenarioFromLocation } from './mocks';
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
      const mocks: Scenarios = {
        default: [
          { url: /foo/, method: httpMethod, response: {}, responseCode: 200 },
          { url: /bar/, method: httpMethod, response: {}, responseCode: 200 }
        ]
      };
      test(`Mocks calls for ${httpMethod}`, () => {
        const spy = jest.spyOn(FetchMock, httpMethod.toLowerCase() as any);

        injectMocks(mocks, 'default');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy.mock.calls[0][0]).toEqual(/foo/);
        expect(spy.mock.calls[1][0]).toEqual(/bar/);
      });
    });
  });

  describe('Scenarios', () => {
    test(`Can extract the scenario from a URL`, () => {
      jsdom.reconfigure({
        url: 'https://www.foo.com?scenario=someScenario'
      });
      const scenario = extractScenarioFromLocation(location);
      expect(scenario).toEqual('someScenario');
    });

    const mocks: Scenarios = {
      default: [
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: {}, responseCode: 200 }
      ],
      someScenario: [
        { url: /bar/, method: 'GET', response: {foo: 'bar'}, responseCode: 200 }
      ]
    };
  });
})
