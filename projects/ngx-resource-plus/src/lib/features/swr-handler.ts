import { computed, signal, Signal, WritableSignal } from '@angular/core';

export function createSwrBuffer<T>(nativeValue: Signal<T | undefined>, swrEnabled: boolean) {
  let cachedValue: T | undefined = undefined;

  const buffer = computed(() => {
    const current = nativeValue();
    if (current !== undefined) {
      cachedValue = current;
    }
    return cachedValue;
  });

  const value = computed(() => {
    return swrEnabled ? buffer() : nativeValue();
  });

  return { value, buffer };
}
