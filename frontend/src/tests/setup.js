import '@testing-library/jest-dom';

// localStorage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// CSS custom properties fallback (jsdom doesn't parse them)
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({ getPropertyValue: () => '' }),
});
