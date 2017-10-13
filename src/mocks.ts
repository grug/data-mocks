import * as FetchMock from 'fetch-mock';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface Mock {
  url: RegExp | string,
  method: HttpMethod,
  response: object, // TODO - better type this?
  responseCode?: number,
  delay?: number
}

const addDelay = (delay: number) => new Promise((res) => setTimeout(res, delay));

export const injectMocks = (mocks: Mock[]): void => {
  if (!mocks || mocks.length === 0) {
    console.warn('Unable to instantiate mocks');
    return;
  }

  mocks.forEach(({ method, url, response, delay = 0 }) => {
    const finalResponse = {
      body: JSON.stringify(response)
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
        console.error(`Unrecognised HTTP method ${method} - please check your mock configuration`);
    }
  });
};
