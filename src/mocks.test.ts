import { injectMocks, Mock, HttpMethod } from './mocks';
import * as FetchMock from 'fetch-mock';

describe('data-mocks', () => {
  const httpMethods: HttpMethod[] = [
    'GET',
    'POST',
    'PUT',
    'DELETE'
  ];

  httpMethods.forEach(httpMethod => {
    const mocks: Mock[] = [
      { url: /foo/, method: httpMethod, response: {}, responseCode: 200 },
      { url: /bar/, method: httpMethod, response: {}, responseCode: 200 }
    ];

    test(`Mocks calls for ${httpMethod}`, () => {
      const spy = jest.spyOn(FetchMock, httpMethod.toLowerCase() as any);

      injectMocks(mocks);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[0][0]).toEqual(/foo/);
      expect(spy.mock.calls[1][0]).toEqual(/bar/);
    });
  });
})
