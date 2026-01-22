import '@testing-library/jest-dom';

// Mock crypto.randomUUID for tests
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
  } as Crypto;
}
