import { ResourceLoaderParams } from '@angular/core';
import { RetryConfig } from '../shared/interfaces/options';
import { signalTimeout } from '../shared/utils/signal-helpers';

export async function executeRetryLoader<T, P>(
  ctx: ResourceLoaderParams<P>,
  loader: (ctx: ResourceLoaderParams<P>) => PromiseLike<T>,
  config: number | RetryConfig,
  onAttempt: (attempt: number) => void,
): Promise<T> {
  const maxRetries = typeof config === 'number' ? config : config.count;
  const baseDelay = typeof config === 'number' ? 1000 : config.delay;
  const isExponential = typeof config === 'object' && config.backoff === 'exponential';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.resolve(loader(ctx));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (attempt >= maxRetries) throw error;

      onAttempt(attempt + 1);

      const delay = isExponential ? baseDelay * Math.pow(2, attempt) : baseDelay;
      await signalTimeout(delay);
    }
  }
  throw new Error('[ngx-resource-plus]: Retry limit exceeded.');
}
