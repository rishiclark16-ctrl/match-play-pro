import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
import { mock } from 'bun:test';

// Stub Capacitor's CommonJS plugin registration before any test or app
// module loads. @capacitor/app/dist/plugin.cjs.js calls
// require('@capacitor/core').registerPlugin(...) at module init; in CI
// the resolved core module doesn't expose registerPlugin via the vi.mock
// shim because it's a CJS require, not an ESM import. Mock at the bun
// runtime level so every code path sees the stub.
mock.module('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
    isPluginAvailable: () => false,
  },
  registerPlugin: () => new Proxy({}, { get: () => () => Promise.resolve() }),
  WebPlugin: class WebPlugin {},
}));
mock.module('@capacitor/app', () => ({
  App: {
    addListener: () => Promise.resolve({ remove: () => {} }),
    removeAllListeners: () => Promise.resolve(),
    getInfo: () => Promise.resolve({ name: 'test', id: 'test', build: '1', version: '1' }),
    getState: () => Promise.resolve({ isActive: true }),
    exitApp: () => Promise.resolve(),
  },
}));

// In CI we get env vars via process.env (workflow `env:` block); bun's
// import.meta.env normally pulls from the local .env file, which doesn't
// exist on the runner. Mirror VITE_* vars from process.env onto
// import.meta.env so client.ts and friends see them in both contexts.
const meta = (import.meta as unknown as { env: Record<string, string | undefined> });
if (!meta.env) (meta as { env: Record<string, string | undefined> }).env = {};
for (const k of Object.keys(process.env)) {
  if (k.startsWith('VITE_') && meta.env[k] === undefined) {
    meta.env[k] = process.env[k];
  }
}
// Provide harmless defaults so Supabase client construction succeeds even
// when the workflow forgot to pass a publishable key.
if (!meta.env.VITE_SUPABASE_URL) meta.env.VITE_SUPABASE_URL = 'http://localhost:54321';
if (!meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';

// Set up jsdom environment for bun test runner (which doesn't provide DOM by default)
if (typeof document === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });
  const win = dom.window as Window & typeof globalThis;

  // Populate globals
  (globalThis as Record<string, unknown>).window = win;
  (globalThis as Record<string, unknown>).document = win.document;
  (globalThis as Record<string, unknown>).navigator = win.navigator;
  (globalThis as Record<string, unknown>).location = win.location;
  (globalThis as Record<string, unknown>).history = win.history;
  (globalThis as Record<string, unknown>).screen = win.screen;
  (globalThis as Record<string, unknown>).HTMLElement = win.HTMLElement;
  (globalThis as Record<string, unknown>).Element = win.Element;
  (globalThis as Record<string, unknown>).Node = win.Node;
  (globalThis as Record<string, unknown>).NodeList = win.NodeList;
  (globalThis as Record<string, unknown>).Event = win.Event;
  (globalThis as Record<string, unknown>).CustomEvent = win.CustomEvent;
  (globalThis as Record<string, unknown>).MouseEvent = win.MouseEvent;
  (globalThis as Record<string, unknown>).KeyboardEvent = win.KeyboardEvent;
  (globalThis as Record<string, unknown>).MutationObserver = win.MutationObserver;
  (globalThis as Record<string, unknown>).ResizeObserver = win.ResizeObserver ?? class ResizeObserver { observe() {} unobserve() {} disconnect() {} };
  (globalThis as Record<string, unknown>).IntersectionObserver = win.IntersectionObserver ?? class IntersectionObserver { observe() {} unobserve() {} disconnect() {} constructor(_cb: unknown, _opts?: unknown) {} };
  (globalThis as Record<string, unknown>).getComputedStyle = win.getComputedStyle.bind(win);
  (globalThis as Record<string, unknown>).requestAnimationFrame = win.requestAnimationFrame?.bind(win) ?? ((cb: FrameRequestCallback) => { setTimeout(cb, 16); return 0; });
  (globalThis as Record<string, unknown>).cancelAnimationFrame = win.cancelAnimationFrame?.bind(win) ?? clearTimeout;
  (globalThis as Record<string, unknown>).localStorage = win.localStorage;
  (globalThis as Record<string, unknown>).sessionStorage = win.sessionStorage;
  (globalThis as Record<string, unknown>).matchMedia = win.matchMedia?.bind(win) ?? (() => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }));
}

import '@testing-library/jest-dom';

// Mock crypto.randomUUID for tests
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
  } as Crypto;
}

// Polyfill browser APIs for Node.js test environment
if (typeof globalThis.localStorage === 'undefined') {
  const _storage: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string): string | null => _storage[key] ?? null,
      setItem: (key: string, value: string): void => { _storage[key] = String(value); },
      removeItem: (key: string): void => { delete _storage[key]; },
      clear: (): void => { Object.keys(_storage).forEach(k => delete _storage[k]); },
      get length(): number { return Object.keys(_storage).length; },
      key: (index: number): string | null => Object.keys(_storage)[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const _storage: Record<string, string> = {};
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (key: string): string | null => _storage[key] ?? null,
      setItem: (key: string, value: string): void => { _storage[key] = String(value); },
      removeItem: (key: string): void => { delete _storage[key]; },
      clear: (): void => { Object.keys(_storage).forEach(k => delete _storage[k]); },
      get length(): number { return Object.keys(_storage).length; },
      key: (index: number): string | null => Object.keys(_storage)[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}
