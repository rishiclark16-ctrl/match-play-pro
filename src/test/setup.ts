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
mock.module('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: () => Promise.resolve(),
    setBackgroundColor: () => Promise.resolve(),
    show: () => Promise.resolve(),
    hide: () => Promise.resolve(),
  },
  Style: { Light: 'LIGHT', Dark: 'DARK', Default: 'DEFAULT' },
}));
mock.module('@capacitor/haptics', () => ({
  Haptics: {
    impact: () => Promise.resolve(),
    notification: () => Promise.resolve(),
    vibrate: () => Promise.resolve(),
    selectionStart: () => Promise.resolve(),
    selectionChanged: () => Promise.resolve(),
    selectionEnd: () => Promise.resolve(),
  },
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));
mock.module('@capacitor/push-notifications', () => ({
  PushNotifications: {
    register: () => Promise.resolve(),
    requestPermissions: () => Promise.resolve({ receive: 'granted' }),
    addListener: () => Promise.resolve({ remove: () => {} }),
    removeAllListeners: () => Promise.resolve(),
    getDeliveredNotifications: () => Promise.resolve({ notifications: [] }),
    removeAllDeliveredNotifications: () => Promise.resolve(),
  },
}));
mock.module('@capacitor/splash-screen', () => ({
  SplashScreen: { show: () => Promise.resolve(), hide: () => Promise.resolve() },
}));
mock.module('@capacitor-community/keep-awake', () => ({
  KeepAwake: {
    keepAwake: () => Promise.resolve(),
    allowSleep: () => Promise.resolve(),
    isSupported: () => Promise.resolve({ isSupported: false }),
  },
}));
mock.module('@capacitor-community/apple-sign-in', () => ({
  SignInWithApple: { authorize: () => Promise.resolve({ response: {} }) },
}));
mock.module('@capacitor-community/contacts', () => ({
  Contacts: {
    requestPermissions: () => Promise.resolve({ contacts: 'granted' }),
    getContacts: () => Promise.resolve({ contacts: [] }),
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

// number-flow (used by some UI components) calls customElements.define at
// import time. JSDOM doesn't always provide it; stub a no-op registry so
// tests that pull these components render without throwing.
if (typeof globalThis.customElements === 'undefined') {
  const registry = new Map<string, CustomElementConstructor>();
  (globalThis as { customElements: CustomElementRegistry }).customElements = {
    // Idempotent: silently no-op on re-registration so tests across files
    // can repeatedly load modules that call customElements.define at import.
    define: (name: string, ctor: CustomElementConstructor) => {
      if (!registry.has(name)) registry.set(name, ctor);
    },
    get: (name: string) => registry.get(name),
    upgrade: () => {},
    whenDefined: () => Promise.resolve(undefined as unknown as CustomElementConstructor),
  } as unknown as CustomElementRegistry;
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
