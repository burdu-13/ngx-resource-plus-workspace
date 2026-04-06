import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideResourcePlus } from 'ngx-resource-plus';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideResourcePlus({
      retry: { count: 3, delay: 800, backoff: 'exponential' },
      swr: true,
    }),
  ],
};
