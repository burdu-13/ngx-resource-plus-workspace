import {
  signal,
  ResourceStatus,
  ResourceSnapshot,
  Signal,
  ResourceRef,
  computed,
} from '@angular/core';
import { ResourcePlusRef } from '../src/lib/shared/interfaces/ref';

function createHasValueMock<T>(value: Signal<T | undefined>) {
  const guard = function (
    this: ResourceRef<T | undefined>,
  ): this is ResourceRef<Exclude<T, undefined>> {
    return value() !== undefined;
  };

  return guard as (() => boolean) & {
    (this: ResourceRef<T | undefined>): this is ResourceRef<Exclude<T, undefined>>;
  };
}

export function createMockResourcePlus<T>(initialValue?: T): ResourcePlusRef<T> {
  const valueSignal = signal<T | undefined>(initialValue);
  const loadingSignal = signal<boolean>(false);

  const statusSignal = signal<ResourceStatus>(initialValue !== undefined ? 'resolved' : 'idle');
  const errorSignal = signal<Error | undefined>(undefined);

  const snapshotSignal = computed<ResourceSnapshot<T | undefined>>(() => {
    const s = statusSignal();
    const v = valueSignal();
    const e = errorSignal();

    if (s === 'resolved' || s === 'local') {
      return { status: s, value: v };
    }
    if (s === 'error') {
      return { status: 'error', value: v, error: e ?? new Error('Unknown error') };
    }
    if (s === 'loading' || s === 'reloading') {
      return { status: s, value: v };
    }

    return { status: 'idle', value: v };
  });

  return {
    value: valueSignal.asReadonly(),
    isStale: signal<boolean>(false).asReadonly(),
    lastUpdated: signal<Date | null>(null).asReadonly(),
    retryAttempt: signal<number>(0).asReadonly(),

    status: statusSignal.asReadonly(),
    error: errorSignal.asReadonly(),
    isLoading: loadingSignal.asReadonly(),
    hasValue: createHasValueMock(valueSignal),
    snapshot: snapshotSignal,

    reload: (): boolean => {
      loadingSignal.set(true);
      return true;
    },
    destroy: (): void => {},
    set: (val: T | undefined): void => valueSignal.set(val),
    update: (updater: (value: T | undefined) => T | undefined): void => {
      valueSignal.update(updater);
    },
    asReadonly: function (this: ResourcePlusRef<T>) {
      return this;
    },
  };
}
