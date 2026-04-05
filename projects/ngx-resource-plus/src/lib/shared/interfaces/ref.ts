import { ResourceRef, Signal } from '@angular/core';

export type ResourcePlusRef<T> = Omit<ResourceRef<T>, 'value'> & {
  readonly value: Signal<T | undefined>;
  readonly isStale: Signal<boolean>;
  readonly lastUpdated: Signal<Date | null>;
  readonly retryAttempt: Signal<number>;
};
