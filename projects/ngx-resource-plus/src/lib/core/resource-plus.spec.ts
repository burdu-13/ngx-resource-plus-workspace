import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Injector, runInInjectionContext } from '@angular/core';
import { resourcePlus } from './resource-plus';
import { RESOURCE_PLUS_CONFIG } from '../shared/tokens/config.token';
import { expect, it, describe, beforeEach, vi, afterEach } from 'vitest';

describe('resourcePlus Orchestrator', () => {
  let injector: Injector;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RESOURCE_PLUS_CONFIG,
          useValue: { swr: true, retry: { count: 2, delay: 10 } },
        },
      ],
    });
    injector = TestBed.inject(Injector);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize and resolve data successfully', async () => {
    await runInInjectionContext(injector, async () => {
      const res = resourcePlus({
        loader: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'Success';
        },
      });

      expect(res.isLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(100);

      expect(res.value()).toBe('Success');
      expect(res.status()).toBe('resolved');
      expect(res.lastUpdated()).toBeInstanceOf(Date);
    });
  });

  it('should implement SWR behavior: value persists while loading new data', async () => {
    await runInInjectionContext(injector, async () => {
      const params: WritableSignal<number> = signal(1);
      const res = resourcePlus({
        params: () => params(),
        loader: async ({ params }) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return `Data ${params}`;
        },
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(res.value()).toBe('Data 1');

      params.set(2);
      TestBed.flushEffects();

      expect(res.isLoading()).toBe(true);
      expect(res.isStale()).toBe(true);
      expect(res.value()).toBe('Data 1');

      await vi.advanceTimersByTimeAsync(100);
      expect(res.value()).toBe('Data 2');
      expect(res.isStale()).toBe(false);
    });
  });

  it('should orchestrate retries and update retryAttempt signal', async () => {
    await runInInjectionContext(injector, async () => {
      let attempts = 0;
      const res = resourcePlus({
        loader: async () => {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          if (attempts < 3) throw new Error('Fail');
          return 'Recovered';
        },
        retry: { count: 3, delay: 10 },
      });

      await vi.advanceTimersByTimeAsync(50);
      expect(res.retryAttempt()).toBe(1);

      await vi.advanceTimersByTimeAsync(60);
      expect(res.retryAttempt()).toBe(2);

      await vi.advanceTimersByTimeAsync(60);
      expect(res.value()).toBe('Recovered');
      expect(res.retryAttempt()).toBe(0);
    });
  });

  it('should handle error states and transition status to error', async () => {
    await runInInjectionContext(injector, async () => {
      const res = resourcePlus({
        loader: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          throw new Error('Fatal');
        },
        retry: { count: 0, delay: 0 },
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(res.error()).toBeTruthy();
      expect(res.status()).toBe('error');
      expect(res.isLoading()).toBe(false);
    });
  });

  it('should maintain reactivity for snapshot signal with type narrowing', async () => {
    await runInInjectionContext(injector, async () => {
      const res = resourcePlus({
        loader: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return 'Snapshot Test';
        },
      });

      expect(res.isLoading()).toBe(true);

      await vi.advanceTimersByTimeAsync(100);

      const snap = res.snapshot();
      if (snap.status === 'resolved') {
        expect(snap.value).toBe('Snapshot Test');
      } else {
        expect.fail(`Expected status 'resolved' but got '${snap.status}'`);
      }
    });
  });

  it('should ensure native methods preserve the correct context', () => {
    runInInjectionContext(injector, () => {
      const res = resourcePlus({
        loader: async () => 'Context Test',
      });

      expect(() => res.set('New Value')).not.toThrow();
      expect(res.value()).toBe('New Value');

      expect(() => res.update((v) => v + '!')).not.toThrow();
      expect(res.value()).toBe('New Value!');
    });
  });

  it('should correctly propagate SWR disabled state', async () => {
    await runInInjectionContext(injector, async () => {
      const params = signal(1);
      const res = resourcePlus({
        params: () => params(),
        swr: false,
        loader: async ({ params }) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return `NoSWR ${params}`;
        },
      });

      await vi.advanceTimersByTimeAsync(100);
      expect(res.value()).toBe('NoSWR 1');

      params.set(2);
      TestBed.flushEffects();

      expect(res.value()).toBeUndefined();

      await vi.advanceTimersByTimeAsync(100);
      expect(res.value()).toBe('NoSWR 2');
    });
  });

  it('should successfully initialize with a valid reactive stream', async () => {
    await runInInjectionContext(injector, async () => {
      const res = resourcePlus({
        stream: () => Promise.resolve(signal({ value: 'Stream Data' }) as any),
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(res.value()).toBe('Stream Data');
    });
  });
});
