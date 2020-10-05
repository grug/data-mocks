# data-mocks

[![npm version](https://badge.fury.io/js/data-mocks.svg)](https://badge.fury.io/js/data-mocks) [![GitHub license](https://img.shields.io/github/license/ovotech/data-mocks.svg)](https://github.com/grug/data-mocks)
![npm](https://img.shields.io/npm/dm/data-mocks.svg)

<img src="https://i.imgur.com/gEG3io2.jpg" height="250">

Library (written in TypeScript) to mock REST and GraphQL requests

<!-- @import "[TOC]" {cmd="toc" depthFrom=1 depthTo=6 orderedList=false} -->

<!-- code_chunk_output -->

- [Why is this library useful](#why-is-this-library-useful)
- [Setup](#setup)
  - [Integration patterns](#integration-patterns)
    - [React](#react)
    - [Angular](#angular)
    - [No framework (just vanilla JS)](#no-framework-just-vanilla-js)
- [REST + GraphQL](#rest-graphql)
- [Examples](#examples)
  - [Basic mock injection without scenarios](#basic-mock-injection-without-scenarios)
  - [Mock injection with scenarios](#mock-injection-with-scenarios)
  - [Basic GraphQL mock injection (Fetch)](#basic-graphql-mock-injection-fetch)
- [Exported types](#exported-types)
  - [Scenarios](#scenarios)
  - [HttpMock](#httpmock)
  - [GraphQLMock](#graphqlmock)
  - [Mock](#mock)
  - [Operation](#operation)
  - [MockConfig](#mockconfig)
- [Exported functions](#exported-functions)
  - [injectMocks](#injectmocks)
  - [extractScenarioFromLocation](#extractscenariofromlocation)
- [Gotchas](#gotchas)

<!-- /code_chunk_output -->

## Why is this library useful

When developing web applications locally, it is not uncommon to request data from an API. However, the API might not actually exist yet, or we might want to control what the responses are.

Typically, this sort of problem has been solved by either writing a separate mock API service alongside the project (i.e. having a Node service running locally with your application) or creating a development database that replicates staging or production environments. Both of these approaches are heavy and can lead to using incorrect data if schemas are out of sync.

This library aims to allow rapid local development without the dependency of a database or fully implemented APIs.

## Setup

- Either `npm install data-mocks` or `yarn add data-mocks`
- Optional: extract the scenario from URL using the imported `extractScenarioFromLocation()` function
  - Or you can just hardcode a string to pass through instead
- Import `injectMocks()` function into your project with `import { injectMocks } from 'data-mocks'`
- Create an array of `Scenario`'s you would like to use (see examples)
- Pass array of `Scenario`'s to `injectMocks()`
- Hooray, all HTTP requests to mocked endpoints will now respond with the mocked data you have specified

### Integration patterns

Regardless of framework or CLI tool used to generate your project, integrating `data-mocks` into your project is easy. Here are how it may look for you:

#### React

```js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

async function main() {
  if (process.env.NODE_ENV === 'development') {
    const { injectMocks, extractScenarioFromLocation } = await import(
      'data-mocks'
    );

    // You could just define your mocks inline if you didn't want to import them.
    const { getMocks } = await import('./path/to/your/mock/definitions');

    injectMocks(getMocks(), extractScenarioFromLocation(window.location));
  }

  ReactDOM.render(<App />, document.getElementById('root'));
}

main();
```

#### Angular

```ts
import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function setupMocks() {
    const { injectMocks, extractScenarioFromLocation } = await import(
      'data-mocks'
    );
    // You could just define your mocks inline if you didn't want to import them.
    const { getMocks } = await import('./path/to/your/mock/definitions');

    injectMocks(getMocks(), extractScenarioFromLocation(window.location));
  }
}

async function main() {
  if (environment.production) {
    enableProdMode();
  }

  if (!environment.production) {
    await setupMocks();
  }

  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .catch((err) => console.error(err));
}

main();
```

#### No framework (just vanilla JS)

```ts
async function main() {
  if (process.env.NODE_ENV === 'development') {
    const { injectMocks, extractScenarioFromLocation } = await import(
      'data-mocks'
    );

    // You could just define your mocks inline if you didn't want to import them.
    const { getMocks } = await import('./path/to/your/mock/definitions');

    injectMocks(getMocks(), extractScenarioFromLocation(window.location));
  }
}

main();
```

In these examples, we dynamically import `data-mocks` and our mock definitions as to not increase production bundle sizes (given that we will never need/want to use these files in production environments).

It is not a requirement to dynamically import `data-mocks` or your mock definitions - it is just a recommendation :)

## REST + GraphQL

`data-mocks` works with either REST or GraphQL requests. It is also possible to easily mock both in the same application.

See the examples below to see how this is done.

## Examples

### Basic mock injection without scenarios

```javascript
import { injectMocks } from 'data-mocks';
import axios from 'axios';

const scenarios = {
  default: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'good response' },
      responseCode: 200,
    },
    {
      url: /some-other-endpoint/,
      method: 'GET',
      response: { another: 'response' },
      responseCode: 200,
      delay: 1000,
    },
    {
      url: /endpoint-with-headers/,
      method: 'GET',
      response: { same: 'response' },
      responseHeaders: { token: 'mock-token' },
      responseCode: 200,
    },
  ],
};

injectMocks(scenarios);

fetch('http://foo.com/login', { method: 'POST', body: {} })
  .then((response) => response.json())
  .then((myJson) => console.log(myJson)); // resolves with { some: 'good response' } after a 200ms delay

fetch('http://foo.com/some-other-endpoint')
  .then((response) => response.json())
  .then((myJson) => console.log(myJson)); // resolves with { another: 'response' } after a 1 second delay

axios
  .post('http://foo.com/login', {})
  .then((response) => console.log(response)); // resolves with { another: 'response' } after a 200ms delay

axios
  .get('http://foo.com/some-other-endpoint')
  .then((response) => console.log(response)); // resolves with { another: 'response' } after a 1 second delay
```

In this example, we define a default scenario in our `scenarios` map. The Scenario objects are described by the [Scenario interface](#scenario). We then inject the scenarios into our application via the [injectMocks() function](#injectMocks). Finally, when we use fetch / XHR to make a request to endpoints that match our scenario objects, the mocked responses are returned.

N.B

In the above example we are using `axios` as our XHR library of choice. However
`data-mocks` will work with any library that uses `XMLHttpRequest` under the hood.

---

### Mock injection with scenarios

```javascript
import { injectMocks, extractScenarioFromLocation } from 'data-mocks';
import axios from 'axios';

const scenarios = {
  default: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'good response' },
      responseCode: 200,
    },
    {
      url: /some-other-endpoint/,
      method: 'GET',
      response: { another: 'response' },
      responseCode: 200,
      delay: 1000,
    },
  ],
  failedLogin: [
    {
      url: /login/,
      method: 'POST',
      response: { some: 'bad things happened' },
      responseCode: 401,
    },
  ],
};

injectMocks(scenarios, 'failedLogin');

fetch('http://foo.com/login', { method: 'POST', body: {} }).then((response) =>
  console.log(response)
); // resolves with a 401 after a 200ms delay

fetch('http://foo.com/some-other-endpoint').then((response) =>
  console.log(response)
); // resolves with { another: 'response' } after a 1 second delay

axios
  .post('http://foo.com/login', {})
  .then((response) => console.log(response)); // resolves with a 401 after a 200ms delay

axios
  .get('http://foo.com/some-other-endpoint')
  .then((response) => console.log(response)); // resolves with { another: 'response' } after a 1 second delay
```

In this example, if we load our site up with `?scenario=failedLogin` in the querystring and then attempt to hit the `login` endpoint, it will fail with a 401. However, the `some-other-endpoint` endpoint will still respond with the response in the `default` scenario as we have not provided one in the `failedLogin` scenario.

### Basic GraphQL mock injection (Fetch)

Here, we have a React application using `urql` as a GraphQL client. This shows how GraphQL queries work and it can be assumed that if you want to use REST mocks in this application, you can do so as you normally would (see examples above).

In reality, the mock definitions would live at a higher level (like the entrypoint into the application) where they could be injected only if we were in development mode.

```tsx
import React from 'react';
import { injectMocks, extractScenarioFromLocation } from 'data-mocks';
import gql from 'graphql-tag';

const mocks = {
  default: [
    {
      url: /graphql/,
      method: 'GRAPHQL',
      operations: [
        {
          operationName: 'Query',
          type: 'query',
          response: { data: { test: 'test' } },
        },
        {
          operationName: 'Mutation',
          type: 'mutation',
          response: { data: { test: 'test' } },
        },
      ],
    },
  ],
};

injectMocks(mocks, extractScenarioFromLocation(window.location));

const Component = () => {
  const [result] = useQuery({ query: Query }); // result will be { data: { test: 'test' } }

  return <>{result.data.test}</>;
};
```

## Exported types

### Scenarios

| Property   | Type   | Required | Description                                                                                       |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------- |
| default    | Mock[] | ✅       | The default scenario mapping. Provides a default set of mocked responses.                         |
| [scenario] | Mock[] | ❌       | Additional scenario mappings. The key is the name of the scenario and is what is used in the URL. |

### HttpMock

| Property        | Type             | Required | Description                                                          |
| --------------- | ---------------- | -------- | -------------------------------------------------------------------- |
| url             | RegExp           | ✅       | Regular expression that matches part of the URL.                     |
| method          | string           | ✅       | HTTP method matching one of 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'. |
| response        | object \| string | ✅       | Body of the response.                                                |
| responseCode    | number           | ❌       | Response code. Defaults to 200.                                      |
| responseHeaders | object           | ❌       | Response headers. Defaults to empty.                                 |
| delay           | number           | ❌       | Delay (in milliseconds) before response is returned. Defaults to 0.  |

### GraphQLMock

| Property   | Type               | Required | Description                                               |
| ---------- | ------------------ | -------- | --------------------------------------------------------- |
| url        | RegExp             | ✅       | Regular expression that matches part of the URL.          |
| method     | string             | ✅       | Must be 'GRAPHQL' to specify that this is a GraphQL mock. |
| operations | Array\<Operation\> | ✅       | Array of GraphQL operations for this request.             |

### Mock

Union type of [`HttpMock`](#HttpMock) and [`GraphQLMock`](#GraphQLMock).

### Operation

| Property        | Type   | Required | Description                                                         |
| --------------- | ------ | -------- | ------------------------------------------------------------------- |
| type            | string | ✅       | GraphQL operation type. Must be either `query` or `mutation`.       |
| operationName   | string | ✅       | GraphQL operation name.                                             |
| response        | object | ✅       | Body of the response.                                               |
| responseCode    | number | ❌       | Response code. Defaults to 200.                                     |
| responseHeaders | object | ❌       | Response headers. Defaults to empty.                                |
| delay           | number | ❌       | Delay (in milliseconds) before response is returned. Defaults to 0. |

### MockConfig

| Property                       | Type    | Required | Description                                                                                                        |
| ------------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| allowXHRPassthrough            | boolean | ❌       | Any unmatched routes for XHR will pass through to the actual endpoint, rather than be mocked. Defaults to false.   |
| allowFetchPassthrough          | boolean | ❌       | Any unmatched routes for fetch will pass through to the actual endpoint, rather than be mocked. Defaults to false. |
| disableConsoleWarningsForFetch | boolean | ❌       | When enabled, this will suppress any console warnings generated by fetch-mock fallbacks                            |

## Exported functions

### injectMocks

| Parameter | Type                            | Required | Description                                                                 |
| --------- | ------------------------------- | -------- | --------------------------------------------------------------------------- |
| scenarios | [Scenarios](#Scenarios)[]       | ✅       | A mapping of scenarios and their responses                                  |
| scenario  | keyof [Scenarios](#Scenarios)[] | ❌       | The scenario to run. Defaults to `default`                                  |
| config    | MockConfig                      | ❌       | Config object that allows for different behaviour of how mocks are injected |

### extractScenarioFromLocation

| Parameter | Type                                                                  | Required | Description                                                                                                      |
| --------- | --------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| location  | [Location](https://developer.mozilla.org/en-US/docs/Web/API/Location) | ✅       | The browser location object. The value for the `scenario` part of the querystring will be extracted and returned |

## Gotchas

- GraphQL mocks only work with clients that use Fetch. XHR is currently not supported for this.
- GraphQL operations must have an operation name.
