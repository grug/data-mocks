[![npm version](https://badge.fury.io/js/data-mocks.svg)](https://badge.fury.io/js/data-mocks) [![GitHub license](https://img.shields.io/github/license/ovotech/data-mocks.svg)](https://github.com/ovotech/data-mocks)

# data-mocks


<img src="https://i.imgur.com/gEG3io2.jpg" height="250">

Library to mock local data requests using Fetch and XHR

# Why is this library useful?

When developing web applications locally, it is not uncommon to request data from an API. However, the API might not actually exist yet, or we might want to control what the responses are.

Typically, this sort of problem has been solved by either writing a separate mock API service alongside the project (i.e. having a Node service running locally with your application) or creating a development database that replicates staging or production environments. Both of these approaches are heavy and can lead to using incorrect data if schemas are out of sync.

This library aims to allow rapid local development without the dependency of a database or fully implemented APIs.

# Setup

Assuming your project is using `fetch` / `XHR` for HTTP operations:

- Either `npm install data-mocks` or `yarn add data-mocks`
- Optional: extract the scenario from URL using the imported `extractScenarioFromLocation()` function
  - Or you can just hardcode a string to pass through instead
- Import `injectMocks()` function into your project with `import { injectMocks } from 'data-mocks'`
- Create an array of `Scenario`'s you would like to use (see examples)
- Pass array of `Scenario`'s to `injectMocks()`
- Hooray, all HTTP requests to mocked endpoints will now respond with the mocked data you have specified

# Examples

```javascript
import { injectMocks } from 'data-mocks';
import axios from 'axios';

const scenarios = {
  default: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'good response' },
      responseCode: 200
    },
    {
      url: /some-other-endpoint/,
      method: 'GET',
      response: { another: 'response' },
      responseCode: 200,
      delay: 1000
    }
  ]
};

injectMocks(scenarios);

fetch('http://foo.com/login', { method: 'POST', body: {} }).then(response =>
  console.log(response)
); // resolves with { some: 'good response' } after a 200ms delay

fetch('http://foo.com/some-other-endpoint').then(response =>
  console.log(response)
); // resolves with { another: 'response' } after a 1 second delay

axios.post('http://foo.com/login', {}).then(response => console.log(response)); // resolves with { another: 'response' } after a 200ms delay

axios
  .get('http://foo.com/some-other-endpoint')
  .then(response => console.log(response)); // resolves with { another: 'response' } after a 1 second delay
```

In this example, we define a default scenario in our `scenarios` map. The Scenario objects are described by the [Scenario interface](#scenario). We then inject the scenarios into our application via the [injectMocks() function](#injectMocks). Finally, when we use fetch / XHR to make a request to endpoints that match our scenario objects, the mocked responses are returned.

N.B

In the above example we are using `axios` as our XHR library of choice. However
`data-mocks` will work with any library that uses `XMLHttpRequest` under the hood.

---

```javascript
import { injectMocks, extractScenarioFromLocation } from 'data-mocks';
import axios from 'axios';

const scenarios = {
  default: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'good response' },
      responseCode: 200
    },
    {
      url: /some-other-endpoint/,
      method: 'GET',
      response: { another: 'response' },
      responseCode: 200,
      delay: 1000
    }
  ],
  failedLogin: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'bad things happened' },
      responseCode: 401
    }
  ]
};

injectMocks(scenarios, 'failedLogin');
// The above line could be rewritten as:
// const scenario = extractScenarioFromLocation(window.location);
// injectMocks(scenarios, scenario);

fetch('http://foo.com/login', { method: 'POST', body: {} }).then(response =>
  console.log(response)
); // resolves with a 401 after a 200ms delay

fetch('http://foo.com/some-other-endpoint').then(response =>
  console.log(response)
); // resolves with { another: 'response' } after a 1 second delay

axios.post('http://foo.com/login', {}).then(response => console.log(response)); // resolves with a 401 after a 200ms delay

axios
  .get('http://foo.com/some-other-endpoint')
  .then(response => console.log(response)); // resolves with { another: 'response' } after a 1 second delay
```

In this example, if we load our site up with `scenario=failedLogin` in the querystring and then attempt to hit the `login` endpoint, it will fail with a 401. However, the `some-other-endpoint` endpoint will still respond with the response in the `default` scenario as we have not provided one in the `failedLogin` scenario.

## Exported interfaces

### Scenarios

| Property   | Type   | Required | Description                                                                                      |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| default    | Mock[] | ✅       | The default scenario mapping. Provides a default set of mocked responses                         |
| [scenario] | Mock[] | ❌       | Additional scenario mappings. The key is the name of the scenario and is what is used in the URL |

### Mock

| Property     | Type   | Required | Description                                                        |
| ------------ | ------ | -------- | ------------------------------------------------------------------ |
| url          | RegExp | ✅       | Regular expression that matches part of the URL                    |
| method       | string | ✅       | HTTP method matching one of 'GET', 'POST', 'PUT', 'DELETE'         |
| response     | any    | ✅       | Body of the response                                               |
| responseCode | number | ❌       | Response code. Defaults to 200                                     |
| delay        | number | ❌       | Delay (in milliseconds) before response is returned. Defaults to 0 |

## Exported functions

### injectMocks

| Parameter | Type                            | Required | Description                                |
| --------- | ------------------------------- | -------- | ------------------------------------------ |
| scenarios | [Scenarios](#Scenarios)[]       | ✅       | A mapping of scenarios and their responses |
| scenario  | keyof [Scenarios](#Scenarios)[] | ❌       | The scenario to run. Defaults to `default` |

### extractScenarioFromLocation

| Parameter | Type                                                                  | Required | Description                                                                                                      |
| --------- | --------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| location  | [Location](https://developer.mozilla.org/en-US/docs/Web/API/Location) | ✅       | The browser location object. The value for the `scenario` part of the querystring will be extracted and returned |
