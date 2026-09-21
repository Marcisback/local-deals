import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractUsefulTextFromHtml } from './html-to-text.js';
import {
  fetchSourcePage,
  NonHtmlSourceError,
  SOURCE_FETCH_USER_AGENT,
  SourceFetchFailedError,
  SourceFetchTimeoutError,
  SourceResponseTooLargeError,
  UnsafeSourceUrlError
} from './source-fetcher.js';

const publicResolver = async () => ['93.184.216.34'];

test('fetches a public HTML page with a descriptive user agent', async () => {
  let requestInit: RequestInit | undefined;
  const result = await fetchSourcePage('https://deals.example/weekday', {
    resolveHostname: publicResolver,
    fetchImplementation: async (_url, init) => {
      requestInit = init;
      return htmlResponse('<main><h1>Happy hour</h1><p>Weekdays 3–6 PM</p></main>');
    }
  });

  assert.equal(result.finalUrl, 'https://deals.example/weekday');
  assert.match(result.html, /Happy hour/);
  assert.equal(new Headers(requestInit?.headers).get('user-agent'), SOURCE_FETCH_USER_AGENT);
  assert.equal(requestInit?.redirect, 'manual');
});

test('extracts useful HTML text and removes script, style, noscript, and nav content', () => {
  const text = extractUsefulTextFromHtml(
    `
      <html>
        <head><style>.hidden { display: none }</style></head>
        <body>
          <nav>Home Reservations</nav>
          <main>
            <h1>Happy Hour</h1>
            <p>Monday – Friday <strong>3 PM – 6 PM</strong></p>
            <ul><li><a href="/menu">$6 house cocktails</a></li></ul>
            <script>stealSecrets()</script>
            <noscript>Enable scripts</noscript>
          </main>
        </body>
      </html>
    `,
    10_000
  );

  assert.match(text, /Happy Hour/);
  assert.match(text, /Monday – Friday 3 PM – 6 PM/);
  assert.match(text, /\$6 house cocktails/);
  assert.doesNotMatch(text, /Home Reservations|stealSecrets|Enable scripts|display: none/);
});

test('caps extracted HTML text before model use', () => {
  assert.equal(extractUsefulTextFromHtml(`<p>${'a'.repeat(100)}</p>`, 25).length, 25);
});

test('rejects non-HTML responses', async () => {
  await assert.rejects(
    fetchSourcePage('https://deals.example/menu.pdf', {
      resolveHostname: publicResolver,
      fetchImplementation: async () =>
        new Response('pdf', { headers: { 'content-type': 'application/pdf' } })
    }),
    NonHtmlSourceError
  );
});

test('maps request timeouts and fetch failures without exposing response content', async () => {
  await assert.rejects(
    fetchSourcePage('https://deals.example/slow', {
      resolveHostname: publicResolver,
      timeoutMs: 5,
      fetchImplementation: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    }),
    SourceFetchTimeoutError
  );

  await assert.rejects(
    fetchSourcePage('https://deals.example/slow-body', {
      resolveHostname: publicResolver,
      timeoutMs: 5,
      fetchImplementation: async (_url, init) => {
        let bodyController: ReadableStreamDefaultController<Uint8Array>;
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            bodyController = controller;
          }
        });
        init.signal?.addEventListener('abort', () => {
          bodyController.error(new DOMException('Aborted', 'AbortError'));
        });
        return new Response(body, { headers: { 'content-type': 'text/html' } });
      }
    }),
    SourceFetchTimeoutError
  );

  await assert.rejects(
    fetchSourcePage('https://deals.example/failure', {
      resolveHostname: publicResolver,
      fetchImplementation: async () => {
        throw new Error('connection refused');
      }
    }),
    SourceFetchFailedError
  );
});

test('rejects responses that exceed the declared or streamed byte limit', async () => {
  await assert.rejects(
    fetchSourcePage('https://deals.example/declared-large', {
      resolveHostname: publicResolver,
      maxResponseBytes: 10,
      fetchImplementation: async () =>
        htmlResponse('small', { 'content-length': '11' })
    }),
    SourceResponseTooLargeError
  );

  await assert.rejects(
    fetchSourcePage('https://deals.example/streamed-large', {
      resolveHostname: publicResolver,
      maxResponseBytes: 10,
      fetchImplementation: async () => htmlResponse('this body is larger than ten bytes')
    }),
    SourceResponseTooLargeError
  );
});

test('rejects malformed and non-http URLs', async () => {
  for (const url of ['not-a-url', 'file:///etc/passwd', 'ftp://example.com/menu']) {
    await assert.rejects(fetchSourcePage(url), UnsafeSourceUrlError);
  }
});

test('blocks localhost, private, link-local, and obvious internal destinations', async () => {
  const blockedUrls = [
    'http://localhost/deals',
    'http://127.0.0.1/deals',
    'http://10.0.0.1/deals',
    'http://172.16.0.1/deals',
    'http://192.168.1.1/deals',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/deals',
    'http://[fe80::1]/deals',
    'http://[fc00::1]/deals',
    'http://service.internal/deals',
    'http://service.internal./deals'
  ];

  for (const url of blockedUrls) {
    await assert.rejects(
      fetchSourcePage(url, {
        resolveHostname: publicResolver,
        fetchImplementation: async () => {
          throw new Error('fetch must not be reached');
        }
      }),
      UnsafeSourceUrlError,
      url
    );
  }

  await assert.rejects(
    fetchSourcePage('https://deals.example/private-dns', {
      resolveHostname: async () => ['192.168.1.10'],
      fetchImplementation: async () => {
        throw new Error('fetch must not be reached');
      }
    }),
    UnsafeSourceUrlError
  );
});

test('re-checks redirect destinations and blocks unsafe redirects', async () => {
  let fetchCalls = 0;
  await assert.rejects(
    fetchSourcePage('https://deals.example/redirect', {
      resolveHostname: publicResolver,
      fetchImplementation: async () => {
        fetchCalls += 1;
        return new Response(null, {
          status: 302,
          headers: { location: 'http://127.0.0.1/admin' }
        });
      }
    }),
    UnsafeSourceUrlError
  );

  assert.equal(fetchCalls, 1);
});

function htmlResponse(body: string, headers: Record<string, string> = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...headers
    }
  });
}
