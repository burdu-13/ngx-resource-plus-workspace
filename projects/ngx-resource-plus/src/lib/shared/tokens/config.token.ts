import { InjectionToken, Provider } from '@angular/core';
import { RetryConfig } from '../interfaces/options';

export interface ResourcePlusConfig {
  swr?: boolean;
  retry?: number | RetryConfig;
}

export const RESOURCE_PLUS_CONFIG = new InjectionToken<ResourcePlusConfig>('RESOURCE_PLUS_CONFIG');

export function provideResourcePlus(config: ResourcePlusConfig): Provider {
  return {
    provide: RESOURCE_PLUS_CONFIG,
    useValue: config,
  };
}
