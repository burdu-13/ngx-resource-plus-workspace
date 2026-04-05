import { computed, signal, Signal, WritableSignal } from '@angular/core';

export function createSwrBuffer<T>(nativeValue: Signal<T | undefined>, enabled: boolean) {
  const buffer: WritableSignal<T | undefined> = signal(undefined);

  const value = computed(() => {
    const current = nativeValue();
    if (current !== undefined) {
      buffer.set(current);
      return current;
    }
    return enabled ? buffer() : undefined;
  });

  return { value, buffer: buffer.asReadonly() };
}
