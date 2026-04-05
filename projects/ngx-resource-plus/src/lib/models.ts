import { ResourceRef, ResourceOptions } from '@angular/core';

export interface RetryConfig {
  count: number;
  delay: number;
  backoff?: 'fixed' | 'exponential';
}

export type ResourcePlusOptions<T, P> = ResourceOptions<T, P> & {
  swr?: boolean;
  retry?: number | RetryConfig;
};

export type ResourcePlusRef<T> = ResourceRef<T> & {
  isStale: () => boolean;
  lastUpdated: () => Date | null;
};