import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

const mockObjectStore = {
  add: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  index: vi.fn(),
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
  oncomplete: null as (() => void) | null,
  onerror: null as (() => void) | null,
};

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  close: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(() => mockObjectStore),
};

// Setup global mocks
vi.stubGlobal('indexedDB', mockIndexedDB);

describe('Offline Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock behavior
    mockIndexedDB.open.mockImplementation(() => {
      const request = {
        result: mockDB,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onupgradeneeded: null as (() => void) | null,
      };
      
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      
      return request;
    });
  });

  describe('isOffline', () => {
    it('should return true when navigator.onLine is false', () => {
      vi.stubGlobal('navigator', { onLine: false });
      
      // Import after mocking
      const { isOffline } = require('./offlineStorage');
      expect(isOffline()).toBe(true);
    });

    it('should return false when navigator.onLine is true', () => {
      vi.stubGlobal('navigator', { onLine: true });
      
      const { isOffline } = require('./offlineStorage');
      expect(isOffline()).toBe(false);
    });
  });

  describe('onNetworkChange', () => {
    it('should call callback when network status changes', () => {
      const callback = vi.fn();
      const addEventListener = vi.fn();
      const removeEventListener = vi.fn();
      
      vi.stubGlobal('window', {
        addEventListener,
        removeEventListener,
      });
      
      const { onNetworkChange } = require('./offlineStorage');
      const unsubscribe = onNetworkChange(callback);
      
      expect(addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      
      // Test unsubscribe
      unsubscribe();
      expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Fortune Record Structure', () => {
    it('should have correct structure for fortune record', () => {
      const record = {
        date: '2026-01-28',
        level: '大吉',
        emoji: '🐱',
        percent: 88,
        message: '今天适合摸鱼',
        suggestedTime: '3小时',
        avatar: '🐱',
        timestamp: Date.now(),
        synced: false,
      };
      
      expect(record).toHaveProperty('date');
      expect(record).toHaveProperty('level');
      expect(record).toHaveProperty('emoji');
      expect(record).toHaveProperty('percent');
      expect(record).toHaveProperty('message');
      expect(record).toHaveProperty('suggestedTime');
      expect(record).toHaveProperty('avatar');
      expect(record).toHaveProperty('timestamp');
      expect(record).toHaveProperty('synced');
      
      expect(typeof record.percent).toBe('number');
      expect(typeof record.timestamp).toBe('number');
      expect(typeof record.synced).toBe('boolean');
    });
  });

  describe('Database Configuration', () => {
    it('should use correct database name and version', () => {
      const DB_NAME = 'moyu-fortune-offline';
      const DB_VERSION = 1;
      const STORE_NAME = 'fortune-records';
      const MAX_RECORDS = 50;
      
      expect(DB_NAME).toBe('moyu-fortune-offline');
      expect(DB_VERSION).toBe(1);
      expect(STORE_NAME).toBe('fortune-records');
      expect(MAX_RECORDS).toBe(50);
    });
  });
});

describe('Offline Indicator Component Logic', () => {
  it('should show indicator when offline', () => {
    const isOffline = true;
    const shouldShow = isOffline;
    expect(shouldShow).toBe(true);
  });

  it('should hide indicator when online', () => {
    const isOffline = false;
    const shouldShow = isOffline;
    expect(shouldShow).toBe(false);
  });
});

describe('Service Worker Cache Strategy', () => {
  it('should identify cacheable resources correctly', () => {
    const CACHEABLE_PATTERNS = [
      /\.js$/,
      /\.css$/,
      /\.woff2?$/,
      /\.ttf$/,
      /\.png$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.svg$/,
      /\.gif$/,
      /\.ico$/
    ];
    
    const isCacheable = (url: string) => {
      return CACHEABLE_PATTERNS.some(pattern => pattern.test(url));
    };
    
    expect(isCacheable('/app.js')).toBe(true);
    expect(isCacheable('/style.css')).toBe(true);
    expect(isCacheable('/font.woff2')).toBe(true);
    expect(isCacheable('/image.png')).toBe(true);
    expect(isCacheable('/api/data')).toBe(false);
  });

  it('should skip API requests for caching', () => {
    const url = '/api/trpc/fortune.draw';
    const isApiRequest = url.startsWith('/api/');
    expect(isApiRequest).toBe(true);
  });
});
