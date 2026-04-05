import {
  resource,
  computed,
  signal,
  ResourceRef,
  ResourceOptions,
  ResourceLoaderParams,
} from '@angular/core';

import { signalTimeout } from '../shared/utils/signal-helpers';
import { ResourcePlusOptions } from '../shared/interfaces/options';
import { ResourcePlusRef } from '../shared/interfaces/ref';

export function resourcePlus<T, P>(options: ResourcePlusOptions<T, P>): ResourcePlusRef<T> {
  const { swr, retry, loader, stream, ...nativeOptions } = options;

  const lastSuccessValue = signal<T | undefined>(undefined);
  const lastUpdated = signal<Date | null>(null);
  const retryAttempt = signal(0);

  const enhancedLoader = async (ctx: ResourceLoaderParams<P>) => {
    const config = retry;
    const maxRetries = typeof config === 'number' ? config : (config?.count ?? 0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await loader!(ctx);

        lastUpdated.set(new Date());
        retryAttempt.set(0);
        return result;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        if (attempt >= maxRetries) throw error;

        retryAttempt.update((a) => a + 1);

        const delay =
          typeof config === 'object'
            ? config.backoff === 'exponential'
              ? config.delay * Math.pow(2, attempt)
              : config.delay
            : 1000;

        await signalTimeout(delay);
      }
    }
    throw new Error('Retry limit reached');
  };

  const nativeResource = resource({
    ...nativeOptions,
    loader: loader ? enhancedLoader : undefined,
    stream: stream,
  } as any) as ResourceRef<T | undefined>;

  const value = computed(() => {
    const current = nativeResource.value();

    if (current !== undefined) {
      lastSuccessValue.set(current);
      return current;
    }

    return swr !== false ? lastSuccessValue() : undefined;
  });

  const isStale = computed(() => nativeResource.isLoading() && lastSuccessValue() !== undefined);

  return {
    ...nativeResource,
    value,
    isStale,
    lastUpdated: lastUpdated.asReadonly(),
    retryAttempt: retryAttempt.asReadonly(),
  } as unknown as ResourcePlusRef<T>;
}
