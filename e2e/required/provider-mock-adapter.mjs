import { paymentReturnMock } from './payment-provider-fixtures.mjs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { Duplex, Readable, Writable } from 'node:stream';
import tls from 'node:tls';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const PROVIDER_HOST_SUFFIXES = Object.freeze({
  stripe: ['api.stripe.com'],
  slipok: ['api.slipok.com'],
  bunny: ['bunnycdn.com', 'b-cdn.net', 'mediadelivery.net'],
  google: ['accounts.google.com', 'googleapis.com'],
  resend: ['api.resend.com'],
});
const SMTP_PORTS = new Set([25, 465, 587, 2525]);
const MOCK_STATUS = 503;
const MOCK_ERROR = 'required_e2e_provider_unavailable';

function normalizedHostname(value) {
  return String(value || '').replace(/^\[|\]$/g, '').toLowerCase();
}

function providerForHostname(hostname) {
  const normalized = normalizedHostname(hostname);
  for (const [provider, suffixes] of Object.entries(PROVIDER_HOST_SUFFIXES)) {
    if (suffixes.some((suffix) => (
      normalized === suffix || normalized.endsWith(`.${suffix}`)
    ))) {
      return provider;
    }
  }
  return null;
}

function providerForSocket(hostname, port) {
  return providerForHostname(hostname)
    || (SMTP_PORTS.has(Number(port)) ? 'smtp' : null);
}

function providerMockDefinition(provider, path) {
  if (provider === 'stripe') {
    const payment = paymentReturnMock(path);
    if (payment) return payment;
  }
  const body = JSON.stringify({
    error: MOCK_ERROR,
    provider,
  });
  return {
    status: MOCK_STATUS,
    headers: {
      'content-type': 'application/json',
      'x-e2e-provider-mock': provider,
    },
    body,
  };
}

export function requiredE2EProviderForUrl(requestUrl) {
  let request;
  try {
    request = new URL(requestUrl);
  } catch {
    return null;
  }

  if (request.protocol === 'smtp:' || SMTP_PORTS.has(Number(request.port))) {
    return 'smtp';
  }
  return providerForHostname(request.hostname);
}

export function classifyRequiredE2ERequest(requestUrl, appBaseUrl) {
  let request;
  try {
    request = new URL(requestUrl);
  } catch {
    return 'block';
  }

  if (request.protocol === 'data:' || request.protocol === 'blob:') return 'allow';
  if (request.origin === new URL(appBaseUrl).origin) return 'allow';
  return requiredE2EProviderForUrl(requestUrl) ? 'mock-provider' : 'block';
}

export async function installRequiredE2EProviderMocks(page, appBaseUrl) {
  const observations = {
    providerRequests: [],
    blockedRequests: [],
  };

  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    const decision = classifyRequiredE2ERequest(requestUrl, appBaseUrl);

    if (decision === 'allow') {
      await route.continue();
      return;
    }

    if (decision === 'mock-provider') {
      const provider = requiredE2EProviderForUrl(requestUrl);
      if (!provider) throw new Error('Provider mock decision did not identify a provider');

      const mock = providerMockDefinition(provider);
      observations.providerRequests.push(requestUrl);
      await route.fulfill({
        status: mock.status,
        contentType: 'application/json',
        headers: mock.headers,
        body: mock.body,
      });
      return;
    }

    observations.blockedRequests.push(requestUrl);
    await route.abort('blockedbyclient');
  });

  return observations;
}

class RequiredE2EProviderRequest extends Writable {
  constructor(provider, callback, path) {
    super();
    this.provider = provider;
    this.path = path;
    this.headers = new Map();
    this.responded = false;
    if (callback) this.once('response', callback);
    // Stripe's Node adapter waits for a connected socket before ending its request.
    queueMicrotask(() => this.emit('socket', { connecting: false }));
  }

  _write(_chunk, _encoding, callback) {
    callback();
  }

  setHeader(name, value) {
    this.headers.set(String(name).toLowerCase(), value);
  }

  getHeader(name) {
    return this.headers.get(String(name).toLowerCase());
  }

  removeHeader(name) {
    this.headers.delete(String(name).toLowerCase());
  }

  getHeaders() {
    return Object.fromEntries(this.headers);
  }

  flushHeaders() {}

  setNoDelay() {
    return this;
  }

  setSocketKeepAlive() {
    return this;
  }

  setTimeout(_milliseconds, callback) {
    if (callback) this.once('timeout', callback);
    return this;
  }

  abort() {
    this.destroy();
    this.emit('abort');
  }

  end(chunk, encoding, callback) {
    super.end(chunk, encoding, callback);
    queueMicrotask(() => this.respond());
    return this;
  }

  respond() {
    if (this.responded || this.destroyed) return;
    this.responded = true;

    const mock = providerMockDefinition(this.provider, this.path);
    const headers = {
      ...mock.headers,
      'content-length': String(Buffer.byteLength(mock.body)),
    };
    const response = Readable.from([mock.body]);
    response.statusCode = mock.status;
    response.statusMessage = 'Service Unavailable';
    response.headers = headers;
    response.rawHeaders = Object.entries(headers).flat();
    response.httpVersion = '1.1';

    this.emit('response', response);
  }
}

function createProviderRequest(provider, callback, path) {
  return new RequiredE2EProviderRequest(provider, callback, path);
}

function createSmtpSocket() {
  const socket = new Duplex({
    read() {},
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  queueMicrotask(() => {
    const error = new Error('Required E2E SMTP provider mock is unavailable');
    error.code = 'E2E_PROVIDER_MOCK_UNAVAILABLE';
    socket.destroy(error);
  });

  return socket;
}

function assertLocalHostname(hostname) {
  const normalized = normalizedHostname(hostname || 'localhost');
  if (!LOCAL_HOSTS.has(normalized)) {
    throw new Error(`Required E2E blocked external network request to ${normalized}`);
  }
}

function requestTarget(input, defaultProtocol) {
  if (typeof input === 'string' || input instanceof URL) {
    const parsed = new URL(String(input), `${defaultProtocol}//localhost`);
    return { hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search };
  }

  if (input && typeof input === 'object') {
    return {
      hostname: input.hostname || input.host || 'localhost',
      port: input.port,
      path: input.path,
    };
  }

  return { hostname: 'localhost', port: undefined };
}

function guardHttpModule(module, defaultProtocol) {
  const originalRequest = module.request;
  module.request = function guardedRequest(input) {
    const { hostname, path } = requestTarget(input, defaultProtocol);
    const provider = providerForHostname(hostname);
    if (provider) {
      const callback = [...arguments].findLast((argument) => typeof argument === 'function');
      return createProviderRequest(provider, callback, path);
    }

    assertLocalHostname(hostname);
    return originalRequest.apply(this, arguments);
  };

  module.get = function guardedGet() {
    const request = module.request.apply(this, arguments);
    request.end();
    return request;
  };
}

function socketTarget(args) {
  const first = args[0];
  if (first && typeof first === 'object') {
    if (first.path) return { hostname: null, port: null };
    return {
      hostname: first.host || first.hostname || 'localhost',
      port: first.port,
    };
  }

  return {
    hostname: typeof args[1] === 'string' ? args[1] : 'localhost',
    port: first,
  };
}

function guardSocketMethod(module, methodName) {
  const original = module[methodName];
  module[methodName] = function guardedSocketConnection() {
    const { hostname, port } = socketTarget(arguments);
    if (!hostname) return original.apply(this, arguments);

    const provider = providerForSocket(hostname, port);
    if (provider === 'smtp') return createSmtpSocket();
    if (provider) {
      throw new Error(`Required E2E provider mock does not expose raw sockets for ${provider}`);
    }

    assertLocalHostname(hostname);
    return original.apply(this, arguments);
  };
}

export function installRequiredE2EServerProviderMocks() {
  guardHttpModule(http, 'http:');
  guardHttpModule(https, 'https:');
  guardSocketMethod(net, 'connect');
  guardSocketMethod(net, 'createConnection');
  guardSocketMethod(tls, 'connect');

  if (typeof globalThis.fetch === 'function') {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function guardedFetch(input) {
      const target = typeof input === 'string' || input instanceof URL ? input : input.url;
      const { hostname, path } = requestTarget(target, 'http:');
      const provider = providerForHostname(hostname);
      if (provider) {
        const mock = providerMockDefinition(provider, path);
        return Promise.resolve(new Response(mock.body, {
          status: mock.status,
          headers: mock.headers,
        }));
      }

      assertLocalHostname(hostname);
      return originalFetch.apply(this, arguments);
    };
  }
}
