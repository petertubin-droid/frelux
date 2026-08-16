import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Auto-cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock IntersectionObserver (not available in happy-dom)
class MockIntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: number[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock localStorage
const localStorageStore = new Map<string, string>()

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => localStorageStore.set(key, value)),
    removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
    clear: vi.fn(() => localStorageStore.clear()),
    key: vi.fn((i: number) => Array.from(localStorageStore.keys())[i] ?? null),
    get length() { return localStorageStore.size },
  },
})

// Suppress console.error for expected error cases (can be overridden per-test)
const originalError = console.error
console.error = (...args: unknown[]) => {
  // Suppress known noise from React/testing-library
  if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return
  originalError.call(console, ...args)
}
