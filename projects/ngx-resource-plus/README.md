# ngx-resource-plus

**Signal-based SWR and resilient resource management for Angular 21.**

[![npm version](https://img.shields.io/npm/v/ngx-resource-plus.svg)](https://www.npmjs.com/package/ngx-resource-plus)
[![Angular](https://img.shields.io/badge/Angular-21+-dd0031.svg)](https://angular.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tree-shakeable](https://img.shields.io/badge/sideEffects-false-brightgreen.svg)](#)

---

## Why

Angular's `resource()` resets `value()` to `undefined` on every refetch — the user sees a blank screen or spinner even when they had data already loaded. It also has no retry mechanism; a single transient network error puts the resource into a permanent error state.

`resourcePlus()` wraps `resource()` with:

- **SWR (Stale-While-Revalidate)** — `value()` holds the previous data while fresh data loads. No flicker.
- **Auto-retries** — configurable count, delay, and backoff strategy.
- **Extra signals** — `isStale()`, `retryAttempt()`, `lastUpdated()` for precise UI feedback.

---

## Installation

```bash
npm install ngx-resource-plus
# or pnpm add / yarn add
```

Peer dependencies: `@angular/core >= 21.0.0`, `@angular/common >= 21.0.0`.

---

## Quick Start

```typescript
import { Component, signal } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

@Component({
  selector: 'app-user-profile',
  template: `
    @let user = data.value();
    @let loading = data.isLoading();

    @if (user) {
      <h2>{{ user.name }}</h2>
    } @else if (loading) {
      <p>Loading...</p>
    }
  `,
})
export class UserProfileComponent {
  private readonly userId = signal(1);

  protected readonly data = resourcePlus({
    params: () => this.userId(),
    loader: async ({ params }) => {
      const res = await fetch(`/api/users/${params}`);
      return res.json() as Promise<{ name: string }>;
    },
  });
}
```

SWR is on by default. When `userId` changes, the previous user's name stays visible while the new one loads.

---

## Global Configuration

Set app-wide defaults once in your `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideResourcePlus } from 'ngx-resource-plus';

export const appConfig: ApplicationConfig = {
  providers: [
    provideResourcePlus({
      swr: true,
      retry: { count: 3, delay: 800, backoff: 'exponential' },
    }),
  ],
};
```

Per-call `retry` and `swr` options override the global defaults.

---

## API Reference

### `resourcePlus(options)`

Extends Angular's `ResourceOptions` with two additional fields:

| Option  | Type                    | Default | Description |
|:--------|:------------------------|:--------|:------------|
| `swr`   | `boolean`               | `true`  | Keep previous `value()` during refetches. |
| `retry` | `number \| RetryConfig` | —       | Retry on failure. A plain number uses a 1 000 ms fixed delay. |

All other options (`params`, `loader`, `stream`, `defaultValue`, `equal`, `injector`, `debugName`) are the same as Angular's `resource()`.

### `RetryConfig`

| Property  | Type                       | Description |
|:----------|:---------------------------|:------------|
| `count`   | `number`                   | Max retry attempts. |
| `delay`   | `number`                   | Base delay in ms. |
| `backoff` | `'fixed' \| 'exponential'` | `'exponential'` doubles the delay each attempt. |

### Returned signals — `ResourcePlusRef<T>`

| Signal           | Type                        | Description |
|:-----------------|:----------------------------|:------------|
| `value()`        | `Signal<T \| undefined>`    | Resolved data. With SWR, holds the previous value while reloading. |
| `isLoading()`    | `Signal<boolean>`           | `true` while the loader is running. |
| `error()`        | `Signal<unknown>`           | The last loader error, or `undefined`. |
| `status()`       | `Signal<ResourceStatus>`    | `'idle'` \| `'loading'` \| `'reloading'` \| `'resolved'` \| `'error'` \| `'local'` |
| `isStale()`      | `Signal<boolean>`           | `true` when showing old data while a reload is in progress. |
| `retryAttempt()` | `Signal<number>`            | Current retry attempt. Resets to `0` on success. |
| `lastUpdated()`  | `Signal<Date \| null>`      | Timestamp of the last successful load. |
| `snapshot()`     | `Signal<ResourceSnapshot<T \| undefined>>` | Combined `{ status, value, error }` for type-narrowed access. |
| `hasValue()`     | `() => boolean`             | `true` when `value()` is not `undefined`. |

Methods (`reload`, `destroy`, `set`, `update`, `asReadonly`) are identical to Angular's `ResourceRef`.

---

## Examples

### Basic Fetching

```typescript
import { Component } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

interface Post { id: number; title: string; }

@Component({
  selector: 'app-post-list',
  template: `
    @let posts = data.value();
    @let loading = data.isLoading();

    @if (loading && !posts) {
      <p>Loading...</p>
    }

    @if (posts) {
      <ul>
        @for (post of posts; track post.id) {
          <li>{{ post.title }}</li>
        }
      </ul>
    }
  `,
})
export class PostListComponent {
  protected readonly data = resourcePlus<Post[], void>({
    loader: async () => {
      const res = await fetch('/api/posts');
      return res.json();
    },
  });
}
```

### Retries with Live Feedback

```typescript
import { Component, signal } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

@Component({
  selector: 'app-dashboard',
  template: `
    <button (click)="refresh()">Refresh</button>

    @let retries = data.retryAttempt();
    @let posts = data.value();
    @let err = data.error();

    @if (retries > 0) {
      <p>Retry attempt {{ retries }} of 3...</p>
    }

    @if (posts) {
      <pre>{{ posts | json }}</pre>

      @if (data.isStale()) {
        <span>Updating in background...</span>
      }
    }

    @if (err && !posts) {
      <p>Failed to load. <button (click)="data.reload()">Try again</button></p>
    }
  `,
})
export class DashboardComponent {
  private readonly version = signal(0);

  protected readonly data = resourcePlus({
    params: () => this.version(),
    loader: async ({ params }) => {
      const res = await fetch(`/api/data?v=${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    retry: { count: 3, delay: 1000, backoff: 'exponential' },
  });

  refresh(): void {
    this.version.update((v) => v + 1);
  }
}
```

### Flicker-Free UI Pattern

The core pattern: show a skeleton only on the **first** load, and a non-blocking indicator on subsequent refetches.

```html
@let post = data.value();
@let loading = data.isLoading();
@let stale = data.isStale();
@let err = data.error();
@let updated = data.lastUpdated();

<!-- Non-blocking revalidation badge -->
@if (stale) {
  <span>Updating...</span>
}

<!-- Content — stable during refetches thanks to SWR -->
@if (post) {
  <article [class.stale]="stale">
    <h2>{{ post.title }}</h2>

    @if (updated) {
      <small>Updated {{ updated | date:'HH:mm:ss' }}</small>
    }
  </article>
}

<!-- Skeleton — first load only -->
@if (loading && !post) {
  <div class="skeleton"></div>
}

<!-- Error — only when there's nothing to show -->
@if (err && !post) {
  <p>Error: {{ err }}</p>
}
```

> The `@let` declarations keep all signal reads at the top of the template. Downstream `@if` blocks consume plain values — no repeated signal calls, no non-null assertions.

---

## Testing

```typescript
import { createMockResourcePlus } from 'ngx-resource-plus/testing';
```

`createMockResourcePlus<T>(initialValue?)` returns a `ResourcePlusRef<T>` with writable internal signals for full control in tests:

```typescript
const mock = createMockResourcePlus({ name: 'Ada Lovelace' });

// Initial state
expect(mock.value()).toEqual({ name: 'Ada Lovelace' });
expect(mock.isLoading()).toBe(false);

// Simulate loading
mock.internalIsLoading.set(true);
expect(mock.isLoading()).toBe(true);

// Simulate a stale state (SWR revalidating)
mock.internalIsStale.set(true);
mock.internalRetryAttempt.set(2);
expect(mock.isStale()).toBe(true);
expect(mock.retryAttempt()).toBe(2);

// Simulate an error
mock.internalError.set(new Error('timeout'));
mock.internalStatus.set('error');
expect(mock.error()).toBeTruthy();
```

| Writable signal        | Controls           |
|:-----------------------|:-------------------|
| `internalValue`        | `value()`          |
| `internalIsLoading`    | `isLoading()`      |
| `internalIsStale`      | `isStale()`        |
| `internalRetryAttempt` | `retryAttempt()`   |
| `internalStatus`       | `status()`         |
| `internalError`        | `error()`          |

---

## Changelog

### 1.0.0

- **feat:** `resourcePlus()` — SWR + retry on top of Angular's `resource()`
- **feat:** `provideResourcePlus()` — global defaults via DI
- **feat:** `ngx-resource-plus/testing` — `createMockResourcePlus()` test harness
- **perf:** `sideEffects: false` — fully tree-shakeable

---

[MIT](LICENSE)
