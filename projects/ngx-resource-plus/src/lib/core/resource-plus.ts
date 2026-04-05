import { resource, computed, signal, ResourceRef, ResourceLoaderParams } from '@angular/core';
import { ResourcePlusOptions } from '../shared/interfaces/options';
import { ResourcePlusRef } from '../shared/interfaces/ref';
import { executeRetryLoader } from '../features/retry-handler';
import { createSwrBuffer } from '../features/swr-handler';

export function resourcePlus<T, P>(options: ResourcePlusOptions<T, P>): ResourcePlusRef<T> {
  const lastUpdated = signal<Date | null>(null);
  const retryAttempt = signal(0);

  const loader = 'loader' in options ? options.loader : undefined;
  const stream = 'stream' in options ? options.stream : undefined;
  const swrEnabled = options.swr !== false;

  const enhancedLoader = loader
    ? async (ctx: ResourceLoaderParams<P>): Promise<T> => {
        const result = options.retry
          ? await executeRetryLoader(ctx, loader, options.retry, (a) => retryAttempt.set(a))
          : await Promise.resolve(loader(ctx));

        lastUpdated.set(new Date());
        retryAttempt.set(0);
        return result;
      }
    : undefined;

  const nativeResource: ResourceRef<T | undefined> = enhancedLoader
    ? resource({
        loader: enhancedLoader,
        params: options.params,
        defaultValue: options.defaultValue,
        equal: options.equal,
        injector: options.injector,
        debugName: options.debugName,
      })
    : resource({
        stream: stream!,
        params: options.params,
        defaultValue: options.defaultValue,
        equal: options.equal,
        injector: options.injector,
        debugName: options.debugName,
      });

  const { value, buffer } = createSwrBuffer(nativeResource.value, swrEnabled);

  const isStale = computed(() => nativeResource.isLoading() && buffer() !== undefined);

  return {
    value,
    isStale,
    lastUpdated: lastUpdated.asReadonly(),
    retryAttempt: retryAttempt.asReadonly(),

    status: nativeResource.status,
    error: nativeResource.error,
    isLoading: nativeResource.isLoading,
    hasValue: nativeResource.hasValue,
    snapshot: nativeResource.snapshot,

    reload: () => nativeResource.reload(),
    destroy: () => nativeResource.destroy(),
    set: (val: T | undefined) => nativeResource.set(val),
    update: (updater: (value: T | undefined) => T | undefined) => nativeResource.update(updater),
    asReadonly: () => nativeResource.asReadonly(),
  };
}
