import {
  signal,
  ResourceStatus,
  ResourceSnapshot,
  Signal,
  ResourceRef,
  computed,
  WritableSignal,
} from '@angular/core';
import { ResourcePlusRef } from '../src/lib/shared/interfaces/ref';

export interface MockResourcePlus<T> extends ResourcePlusRef<T> {
  internalValue: WritableSignal<T | undefined>;
  internalIsLoading: WritableSignal<boolean>;
  internalIsStale: WritableSignal<boolean>;
  internalRetryAttempt: WritableSignal<number>;
  internalStatus: WritableSignal<ResourceStatus>;
  internalError: WritableSignal<any>;
}

function createHasValueMock<T>(value: Signal<T | undefined>) {
  return function (this: ResourceRef<T | undefined>) {
    return value() !== undefined;
  } as any;
}

export function createMockResourcePlus<T>(initialValue?: T): MockResourcePlus<T> {
  const value = signal<T | undefined>(initialValue);
  const isLoading = signal<boolean>(false);
  const isStale = signal<boolean>(false);
  const retryAttempt = signal<number>(0);
  const status = signal<ResourceStatus>(initialValue !== undefined ? 'resolved' : 'idle');
  const error = signal<any>(undefined);

  const snapshot = computed<ResourceSnapshot<T | undefined>>(() => ({
    status: status(),
    value: value(),
    error: error(),
  }));

  return {
    value: value.asReadonly(),
    isLoading: isLoading.asReadonly(),
    isStale: isStale.asReadonly(),
    retryAttempt: retryAttempt.asReadonly(),
    status: status.asReadonly(),
    error: error.asReadonly(),
    lastUpdated: signal<Date | null>(null).asReadonly(),
    hasValue: createHasValueMock(value),
    snapshot,
    internalValue: value,
    internalIsLoading: isLoading,
    internalIsStale: isStale,
    internalRetryAttempt: retryAttempt,
    internalStatus: status,
    internalError: error,
    reload: () => {
      isLoading.set(true);
      return true;
    },
    destroy: () => {},
    set: (v) => value.set(v),
    update: (fn) => value.update(fn),
    asReadonly: function () {
      return this;
    },
  };
}
