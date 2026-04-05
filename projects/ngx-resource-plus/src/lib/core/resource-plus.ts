import { resource, computed, signal } from '@angular/core';

import { signalTimeout } from '../shared/utils/signal-helpers';
import { ResourcePlusOptions, ResourcePlusRef } from '../models';

export function resourcePlus<T, P>(options: ResourcePlusOptions<T, P>): ResourcePlusRef<T> {
  const lastSuccessValue = signal<T | undefined>(undefined);
  const lastUpdated = signal<Date | null>(null);
  const retryCount = signal(0);

  const originalLoader = options.loader;

  const enhancedLoader = async (param: any) => {
    const config = options.retry;
    const maxRetries = typeof config === 'number' ? config : (config?.count ?? 0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await originalLoader(param);
        lastUpdated.set(new Date());
        retryCount.set(0);
        return result;
      } catch (error) {
        if (attempt >= maxRetries) throw error;

        retryCount.update((c) => c + 1);

        const delay =
          typeof config === 'object'
            ? config.backoff === 'exponential'
              ? config.delay * Math.pow(2, attempt)
              : config.delay
            : 1000;

        await signalTimeout(delay);
      }
    }
    throw new Error('Unreachable');
  };

  const nativeResource = resource<T, P>({
    ...options,
    loader: enhancedLoader,
  });

  const value = computed(() => {
    const current = nativeResource.value();

    if (current !== undefined) {
      lastSuccessValue.set(current);
      return current;
    }

    return options.swr !== false ? lastSuccessValue() : undefined;
  });

  return {
    ...nativeResource,
    value,
    isStale: computed(() => nativeResource.isLoading() && lastSuccessValue() !== undefined),
    lastUpdated: lastUpdated.asReadonly(),
    retryAttempt: retryCount.asReadonly(),
  };
}
