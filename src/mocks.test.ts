import axios from 'axios';
import {
  injectMocks,
  HttpMethod,
  Scenarios,
  extractScenarioFromLocation,
  reduceAllMocksForScenario,
  Mock
} from './mocks';
import XHRMock from 'xhr-mock';
import * as FetchMock from 'fetch-mock';

declare var jsdom: any;

describe('data-mocks', () => {
  describe('HTTP methods', () => {
    const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

    httpMethods.forEach(httpMethod => {
      const scenarios: Scenarios = {
        default: [
          { url: /foo/, method: httpMethod, response: {}, responseCode: 200 },
          { url: /bar/, method: httpMethod, response: {}, responseCode: 200 }
        ]
      };
      test(`Mocks calls for ${httpMethod}`, () => {
        const spy = jest.spyOn(FetchMock, httpMethod.toLowerCase() as any);
        const xhrSpy = jest.spyOn(XHRMock, httpMethod.toLowerCase() as any);

        injectMocks(scenarios, 'default');

        expect(spy).toHaveBeenCalledTimes(2);
        expect(spy.mock.calls[0][0]).toEqual(/foo/);
        expect(spy.mock.calls[1][0]).toEqual(/bar/);

        expect(xhrSpy).toHaveBeenCalledTimes(2);
        expect(xhrSpy.mock.calls[0][0]).toEqual(/foo/);
        expect(xhrSpy.mock.calls[1][0]).toEqual(/bar/);
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
        {
          url: /bar/,
          method: 'GET',
          response: { some: 'otherResponse' },
          responseCode: 401
        },
        { url: /baz/, method: 'POST', response: {}, responseCode: 200 }
      ]
    };
    test(`Can extract the scenario from anywhere in the URL`, () => {
      jsdom.reconfigure({
        url: 'https://www.foo.com?foo=bar&scenario=someScenario'
      });
      const scenario = extractScenarioFromLocation(location);
      expect(scenario).toEqual('someScenario');
    });

    test(`Can create a list for the default scenario`, () => {
      const result = reduceAllMocksForScenario(scenarios, 'default');

      expect(result).toEqual([
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        { url: /bar/, method: 'GET', response: {}, responseCode: 200 }
      ]);
    });

    test(`Can create a list of mocks for a specific scenario`, () => {
      const result = reduceAllMocksForScenario(scenarios, 'someScenario');

      expect(result).toEqual([
        { url: /foo/, method: 'GET', response: {}, responseCode: 200 },
        {
          url: /bar/,
          method: 'GET',
          response: { some: 'otherResponse' },
          responseCode: 401
        },
        { url: /baz/, method: 'POST', response: {}, responseCode: 200 }
      ]);
    });
  });

  describe('XHR mock calls', () => {
    const scenarios: Scenarios = {
      default: [
        {
          url: /foo/,
          method: 'GET',
          response: { foo: 'GET' },
          responseCode: 200
        },
        {
          url: /foo/,
          method: 'POST',
          response: { foo: 'POST' },
          responseCode: 200
        },
        {
          url: /foo/,
          method: 'PUT',
          response: { foo: 'PUT' },
          responseCode: 200
        },
        {
          url: /foo/,
          method: 'DELETE',
          response: { foo: 'DELETE' },
          responseCode: 200
        }
      ]
    };

    beforeAll(() => {
      injectMocks(scenarios, 'default');
    });

    test('Correct response for mocked XHR endpoints', async () => {
      const resGET = await axios.get('/foo');
      expect(resGET.data).toEqual({ foo: 'GET' });

      const resPOST = await axios.post('/foo');
      expect(resPOST.data).toEqual({ foo: 'POST' });

      const resPUT = await axios.put('/foo');
      expect(resPUT.data).toEqual({ foo: 'PUT' });

      const resDELETE = await axios.delete('/foo');
      expect(resDELETE.data).toEqual({ foo: 'DELETE' });
    });
  });
});
