import 'isomorphic-fetch';
import axios from 'axios';
import {
  injectMocks,
  extractScenarioFromLocation,
  reduceAllMocksForScenario,
} from './mocks';
import {
  HttpMethod,
  Scenarios,
  MockConfig,
  WebSocketMock,
  WebSocketServerMock,
} from './types';
import XHRMock, { proxy } from 'xhr-mock';
import fetchMock, { done as done2 } from 'fetch-mock';
import { Server as MockSever } from 'mock-socket';

describe('data-mocks', () => {
  beforeEach(() => {
    fetchMock.resetHistory();
  });

  describe.only('Websocket Server', () => {
    let server: MockSever;
    beforeAll(async () => {
      server = await createServer();
    });

    test('WS echo server can be mocked and is responsive', async () => {
      const testURI = 'ws://localhost/foo';
      const socket = new WebSocket(testURI);
      await awaitSocket(socket, socket.OPEN);
      let res;
      socket.addEventListener('message', (data) => {
        res = data.data;
        socket.close();
      });

      const message = 'hello';
      socket.send(message);

      await awaitSocket(socket, socket.CLOSED);
      return expect(res).toBe(message);
    });
  });
});

const createServer = () => {
  const testURI = 'ws://localhost/foo';
  const testServerMock: WebSocketServerMock = (server) => () => {
    server.on('connection', (socket) => {
      socket.on('message', (data) => {
        socket.send(data.toString());
      });
    });
    return server;
  };
  return testServerMock(new MockSever(testURI))();
};

const awaitSocket = (socket, state) => {
  return new Promise(function (resolve) {
    setTimeout(function () {
      if (socket.readyState === state) {
        resolve(true);
      } else {
        awaitSocket(socket, state).then(resolve);
      }
    }, 1000);
  });
};
