import '@testing-library/jest-dom';

// fetchBaseQuery captures the global `fetch` reference at module-load time
// (when baseApi.ts is first imported), so mocking `global.fetch` inside a test
// file is too late - the captured reference would still be the real one.
// Seeding a stable jest.fn() here (runs before any test module is evaluated)
// lets tests mutate it in place via `.mockResolvedValue/.mockImplementation`
// and have baseApi's captured reference see those mutations.
globalThis.fetch = jest.fn() as unknown as typeof fetch;

// Keep API URLs absolute-but-deterministic (fetchBaseQuery builds a `new
// Request(url)`, which rejects relative URLs) so tests can assert on the path.
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api/v1';

// jest-environment-jsdom replaces the global with a jsdom window that lacks
// Node's web-platform classes (Request/Response/Headers/TextEncoder), but
// fetchBaseQuery constructs `new Request(url, config)` unconditionally and
// undici itself needs TextDecoder. Pull them from Node so those constructions
// work.
// jest-environment-jsdom replaces the global with a jsdom window that lacks
// Node's web-platform classes. fetchBaseQuery constructs `new Request(url,
// config)` unconditionally, so provide a minimal Request shim (jsdom already
// ships Headers). AbortSignal/signal fields are carried through untouched.
class RequestShim {
  url: string;
  method: string;
  headers: Headers;
  body: BodyInit | null;
  signal: AbortSignal | null;
  constructor(input: string | RequestShim, init: RequestInit = {}) {
    if (typeof input === 'string') {
      this.url = input;
      this.method = init.method ?? 'GET';
      this.headers = new Headers(init.headers as HeadersInit | undefined);
      this.body = (init.body as BodyInit | null) ?? null;
      this.signal = (init.signal as AbortSignal | null) ?? null;
    } else {
      this.url = input.url;
      this.method = input.method;
      this.headers = input.headers;
      this.body = input.body;
      this.signal = input.signal;
    }
  }
  clone(): RequestShim {
    return new RequestShim(this);
  }
}
if (typeof globalThis.Request === 'undefined') {
  (globalThis as Record<string, unknown>).Request = RequestShim;
}
if (typeof globalThis.Response === 'undefined') {
  (globalThis as Record<string, unknown>).Response = class ResponseShim {
    status: number;
    statusText: string;
    ok: boolean;
    headers: Headers;
    body: BodyInit | null;
    constructor(body: BodyInit | null = null, init: ResponseInit = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.statusText = init.statusText ?? '';
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new Headers(init.headers as HeadersInit | undefined);
    }
  };
}

// jsdom doesn't implement PointerEvent / pointer capture - base-ui (and most
// Radix-style headless UI kits) listen for these on custom controls like
// Checkbox/Select/ToggleGroup, so clicks on them silently no-op without this.
if (typeof window !== 'undefined') {
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {}
    // @ts-expect-error - minimal polyfill, not a full PointerEvent implementation
    window.PointerEvent = PointerEvent;
  }
  Object.defineProperties(window.HTMLElement.prototype, {
    hasPointerCapture: { value: window.HTMLElement.prototype.hasPointerCapture ?? (() => false), configurable: true },
    setPointerCapture: { value: window.HTMLElement.prototype.setPointerCapture ?? (() => {}), configurable: true },
    releasePointerCapture: { value: window.HTMLElement.prototype.releasePointerCapture ?? (() => {}), configurable: true },
    scrollIntoView: { value: window.HTMLElement.prototype.scrollIntoView ?? (() => {}), configurable: true },
  });
}
