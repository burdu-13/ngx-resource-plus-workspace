import { RetryConfig } from '../interfaces/options';

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  config: number | RetryConfig
): Promise<T> {
  const count = typeof config === 'number' ? config : config.count;
  const delayMs = typeof config === 'number' ? 1000 : config.delay;
  const backoff = typeof config === 'number' ? 'fixed' : (config.backoff ?? 'fixed');

  let lastError: any;
  for (let i = 0; i <= count; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < count) {
        const wait = backoff === 'exponential' ? delayMs * Math.pow(2, i) : delayMs;
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw lastError;
}