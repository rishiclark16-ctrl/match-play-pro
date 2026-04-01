import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';

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
