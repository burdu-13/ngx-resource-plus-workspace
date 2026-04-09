# ngx-resource-plus

**Signal-based SWR and resilient resource management for Angular 21.**

[![npm version](https://img.shields.io/npm/v/ngx-resource-plus.svg)](https://www.npmjs.com/package/ngx-resource-plus)
[![Angular](https://img.shields.io/badge/Angular-21+-dd0031.svg)](https://angular.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tree-shakeable](https://img.shields.io/badge/tree--shakeable-yes-brightgreen.svg)](#)
[![sideEffects](https://img.shields.io/badge/sideEffects-false-brightgreen.svg)](#)

---

## Feature Highlights

- **Stale-While-Revalidate** — Previous data persists while fresh data loads. No flicker. No layout shifts.
- **Automatic Retries** — Fixed or exponential backoff, fully configurable per-call or globally.
- **Signals-First** — Every state (`value`, `isStale`, `retryAttempt`, `lastUpdated`) is a native Angular `Signal`.
- **Drop-in Replacement** — Extends Angular's `resource()` API. Same `loader`/`stream` contract, zero learning curve.
- **Global Configuration** — Set retry and SWR defaults at the application root with `provideResourcePlus()`.
- **Testing Utilities** — First-class `ngx-resource-plus/testing` entry point with `createMockResourcePlus()`.
- **Zero Side-Effects** — Fully tree-shakeable. No runtime overhead for features you don't use.

---

## Motivation

Angular 21's `resource()` API is a powerful primitive for Signal-based async data fetching. However, it has two sharp edges that surface in production:

### The Native Resource Flicker Problem

When `resource()` refetches data — whether from a parameter change or a manual `reload()` — it immediately resets `value()` to `undefined`. In a template, this means:

```html
<!-- Standard resource() — the UI flickers on every refetch -->
@if (data.hasValue()) {
  <div>{{ data.value() }}</div>
} @else {
  <div class="spinner">Loading...</div>  <!-- ← User sees this AGAIN -->
}
```

The user already had data on screen. Now they see a loading spinner. This is **layout shift** — the kind of jank that erodes trust in an interface.

### The Silent Failure Problem

A single transient `503` or network timeout crashes the resource into `status: 'error'` with no recovery path. The user must manually trigger a retry, if the UI even exposes that option.

### How `resourcePlus()` Solves This

`resourcePlus()` wraps Angular's native `resource()` with two composable features:

1. **SWR Buffer** — A computed signal layer that caches the last resolved value. During a refetch, `value()` continues to return the previous data while `isStale()` signals `true`. The UI stays stable; a subtle "Revalidating" indicator replaces the disruptive spinner.

2. **Retry Orchestration** — An async retry loop with configurable `count`, `delay`, and `backoff` strategy. Each attempt is tracked through the `retryAttempt()` signal so the UI can inform the user without blocking them.

The result is an API with the **precision** of production-grade resilience engineering and the **warmth** of a Signal that simply returns data when you read it.

---

## Installation

### Prerequisites

| Dependency      | Version    |
|:----------------|:-----------|
| Angular         | `>= 21.0.0` |
| TypeScript      | `>= 5.8`    |

### Install

```bash
# npm
npm install ngx-resource-plus

# pnpm
pnpm add ngx-resource-plus

# yarn
yarn add ngx-resource-plus
```

> **Note:** `@angular/core` and `@angular/common` are peer dependencies. They will not be installed automatically — your host application must provide them.

---

## Quick Start

```typescript
import { Component, signal } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    @if (user.hasValue()) {
      <h2>{{ user.value()!.name }}</h2>
    } @else if (user.isLoading()) {
      <p>Loading profile...</p>
    }
  `,
})
export class UserProfileComponent {
  private readonly userId = signal(1);

  protected readonly user = resourcePlus({
    params: () => this.userId(),
    loader: async ({ params }) => {
      const res = await fetch(`/api/users/${params}`);
      return res.json();
    },
  });
}
```

That's it. SWR is enabled by default — when `userId` changes, the previous user's data remains visible until the new profile loads.

---

## API Reference

### `resourcePlus<T, P>(options: ResourcePlusOptions<T, P>): ResourcePlusRef<T>`

A function called within an injection context. It wraps Angular's `resource()` with SWR buffering and retry orchestration.

### Inputs — `ResourcePlusOptions<T, P>`

`ResourcePlusOptions` extends Angular's native `ResourceOptions<T, P>` with two additional fields:

| Property        | Type                      | Default   | Description |
|:----------------|:--------------------------|:----------|:------------|
| `params`        | `() => P`                 | —         | Reactive parameter function. When its value changes, the loader re-executes. |
| `loader`        | `(ctx: ResourceLoaderParams<P>) => PromiseLike<T>` | —  | Async function that fetches data. Receives `params` and an `AbortSignal`. |
| `stream`        | As defined by Angular's `resource()` | — | Alternative to `loader` for reactive stream-based data sources. |
| `defaultValue`  | `T`                       | `undefined` | Initial value before the first load completes. |
| `equal`         | `(a: T, b: T) => boolean` | —         | Custom equality function to suppress unnecessary signal emissions. |
| `injector`      | `Injector`                | —         | Explicit injector for use outside injection context. |
| `debugName`     | `string`                  | —         | Debug label for Angular DevTools. |
| `swr`           | `boolean`                 | `true`    | Enable Stale-While-Revalidate behavior. When `true`, previous `value()` persists during refetches. |
| `retry`         | `number \| RetryConfig`   | —         | Retry configuration. A plain `number` sets the retry count with a `1000ms` fixed delay. |

### `RetryConfig`

| Property   | Type                          | Default   | Description |
|:-----------|:------------------------------|:----------|:------------|
| `count`    | `number`                      | —         | Maximum number of retry attempts. |
| `delay`    | `number`                      | —         | Base delay between retries in milliseconds. |
| `backoff`  | `'fixed' \| 'exponential'`    | `'fixed'` | Delay strategy. `'exponential'` doubles the delay on each attempt (`delay * 2^attempt`). |

### State Signals — `ResourcePlusRef<T>`

`ResourcePlusRef<T>` extends Angular's `ResourceRef<T | undefined>` with additional observability signals:

| Signal            | Type                              | Description |
|:------------------|:----------------------------------|:------------|
| `value()`         | `Signal<T \| undefined>`          | The current resolved value. With SWR enabled, this retains the previous value during refetches instead of resetting to `undefined`. |
| `error()`         | `Signal<unknown>`                 | The error thrown by the last failed loader execution. |
| `isLoading()`     | `Signal<boolean>`                 | `true` while the loader is executing. |
| `status()`        | `Signal<ResourceStatus>`          | The current lifecycle status: `'idle'`, `'loading'`, `'reloading'`, `'resolved'`, `'error'`, or `'local'`. |
| `isStale()`       | `Signal<boolean>`                 | `true` when the resource is loading AND a previous value is being displayed (SWR is active). |
| `retryAttempt()`  | `Signal<number>`                  | The current retry attempt number. Resets to `0` on success. |
| `lastUpdated()`   | `Signal<Date \| null>`            | Timestamp of the last successful data resolution. `null` until the first load completes. |
| `snapshot()`      | `Signal<ResourceSnapshot<T \| undefined>>` | A combined snapshot with `status`, `value`, and `error` for type-narrowed template logic. |
| `hasValue()`      | `() => boolean`                   | Returns `true` if the resource has a non-`undefined` value. |

### Methods

| Method                     | Description |
|:---------------------------|:------------|
| `reload()`                 | Triggers a fresh execution of the loader. |
| `destroy()`                | Disposes of the resource and its internal subscriptions. |
| `set(value: T \| undefined)` | Imperatively sets the resource value (local mutation). |
| `update(fn)`               | Updates the value using a transform function. |
| `asReadonly()`              | Returns a read-only view of the resource ref. |

---

## Global Configuration

Use `provideResourcePlus()` in your application config to set default retry and SWR behavior for all `resourcePlus()` calls:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideResourcePlus } from 'ngx-resource-plus';

export const appConfig: ApplicationConfig = {
  providers: [
    provideResourcePlus({
      retry: { count: 3, delay: 800, backoff: 'exponential' },
      swr: true,
    }),
  ],
};
```

### `ResourcePlusConfig`

| Property | Type                    | Description |
|:---------|:------------------------|:------------|
| `swr`    | `boolean`               | Global default for SWR behavior. Individual calls can override. |
| `retry`  | `number \| RetryConfig` | Global default retry configuration. Individual calls can override. |

> **Pro-Tip:** Per-call options always take precedence over global defaults. Use `provideResourcePlus()` to set sensible baselines, then override at the call site for resources with unique requirements.

---

## Usage Examples

### Basic Fetching

A minimal standalone component that fetches a list of posts:

```typescript
import { Component } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

interface Post {
  id: number;
  title: string;
}

@Component({
  selector: 'app-post-list',
  standalone: true,
  template: `
    @if (posts.isLoading() && !posts.hasValue()) {
      <div class="skeleton-list" aria-busy="true">Loading posts...</div>
    }

    @if (posts.hasValue()) {
      <ul>
        @for (post of posts.value()!; track post.id) {
          <li>{{ post.title }}</li>
        }
      </ul>
    }
  `,
})
export class PostListComponent {
  protected readonly posts = resourcePlus<Post[], void>({
    loader: async () => {
      const res = await fetch('/api/posts');
      return res.json();
    },
  });
}
```

### Advanced Resilience

An example demonstrating auto-retry logic against a flaky endpoint. The UI surfaces each retry attempt in real time:

```typescript
import { Component, signal } from '@angular/core';
import { resourcePlus } from 'ngx-resource-plus';

@Component({
  selector: 'app-resilient-dashboard',
  standalone: true,
  template: `
    <header>
      <h1>Dashboard</h1>
      <button (click)="refresh()">Refresh</button>
    </header>

    @let retries = data.retryAttempt();
    @if (retries > 0) {
      <div class="retry-banner" role="alert">
        Attempt {{ retries }} of 3 — retrying automatically...
      </div>
    }

    @if (data.hasValue()) {
      <section>
        <pre>{{ data.value() | json }}</pre>
        @if (data.isStale()) {
          <span class="badge">Revalidating...</span>
        }
      </section>
    }

    @if (data.error(); as err) {
      <div class="error-panel">
        All retry attempts failed: {{ err }}
      </div>
    }
  `,
})
export class ResilientDashboardComponent {
  private readonly trigger = signal(0);

  protected readonly data = resourcePlus({
    params: () => this.trigger(),
    loader: async ({ params }) => {
      const res = await fetch(`/api/dashboard?v=${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    retry: {
      count: 3,
      delay: 1000,
      backoff: 'exponential',
    },
    swr: true,
  });

  refresh(): void {
    this.trigger.update((v) => v + 1);
  }
}
```

### UI Implementation — Flicker-Free Layout

Using Angular 21's modern control flow (`@if`, `@let`) to build a UI that never flickers, even during refetches:

```html
<!-- Smart component template -->
@let value = resource.value();
@let error = resource.error();
@let stale = resource.isStale();
@let loading = resource.isLoading();
@let lastUpdate = resource.lastUpdated();

<!-- Stale-while-revalidate indicator (non-blocking) -->
@if (stale) {
  <div class="revalidating-bar" aria-live="polite">
    <span class="pulse"></span>
    Updating in background...
  </div>
}

<!-- Primary content — always visible once loaded -->
@if (value) {
  <article class="content" [class.stale]="stale">
    <h2>{{ value.title }}</h2>
    <p>{{ value.body }}</p>
    @if (lastUpdate) {
      <footer>Last updated: {{ lastUpdate | date:'HH:mm:ss' }}</footer>
    }
  </article>
}

<!-- Error state — only shown if no cached data exists -->
@if (error && !value) {
  <div class="error" role="alert">
    <strong>Failed to load:</strong> {{ error }}
    <button (click)="resource.reload()">Retry</button>
  </div>
}

<!-- Initial loading — only on first load, before any data exists -->
@if (loading && !value) {
  <div class="skeleton" aria-busy="true">
    <div class="skeleton-line"></div>
    <div class="skeleton-line short"></div>
  </div>
}
```

> **Pro-Tip:** The key pattern is `@if (loading && !value)` — this ensures the loading skeleton is only shown on the _initial_ load. On subsequent refetches, SWR keeps the previous data visible while `isStale()` drives a subtle, non-blocking indicator.

---

## Testing

`ngx-resource-plus` ships a secondary entry point for unit testing:

```typescript
import { createMockResourcePlus } from 'ngx-resource-plus/testing';
```

### `createMockResourcePlus<T>(initialValue?: T): MockResourcePlus<T>`

Creates a fully controllable mock that implements `ResourcePlusRef<T>` with writable internal signals:

```typescript
import { createMockResourcePlus } from 'ngx-resource-plus/testing';

describe('UserProfileComponent', () => {
  it('should display the user name', () => {
    const mockUser = createMockResourcePlus({ name: 'Ada Lovelace' });

    // Assert initial state
    expect(mockUser.value()).toEqual({ name: 'Ada Lovelace' });
    expect(mockUser.isLoading()).toBe(false);
    expect(mockUser.status()).toBe('resolved');

    // Simulate a loading state
    mockUser.internalIsLoading.set(true);
    mockUser.internalStatus.set('loading');
    expect(mockUser.isLoading()).toBe(true);

    // Simulate an error
    mockUser.internalError.set(new Error('Network failure'));
    mockUser.internalStatus.set('error');
    expect(mockUser.error()).toBeTruthy();

    // Simulate a stale-while-revalidate state
    mockUser.internalIsStale.set(true);
    mockUser.internalRetryAttempt.set(2);
    expect(mockUser.isStale()).toBe(true);
    expect(mockUser.retryAttempt()).toBe(2);
  });
});
```

### `MockResourcePlus<T>` Writable Signals

| Signal                  | Type                          | Description |
|:------------------------|:------------------------------|:------------|
| `internalValue`         | `WritableSignal<T \| undefined>` | Control the `value()` output. |
| `internalIsLoading`     | `WritableSignal<boolean>`     | Control the `isLoading()` output. |
| `internalIsStale`       | `WritableSignal<boolean>`     | Control the `isStale()` output. |
| `internalRetryAttempt`  | `WritableSignal<number>`      | Control the `retryAttempt()` output. |
| `internalStatus`        | `WritableSignal<ResourceStatus>` | Control the `status()` output. |
| `internalError`         | `WritableSignal<any>`         | Control the `error()` output. |

---

## Changelog

### 1.0.0 (2025-04-09)

#### Features

- **feat(core):** `resourcePlus()` function — drop-in replacement for Angular's `resource()` with SWR and retry support
- **feat(swr):** Stale-While-Revalidate buffer — prevents `value()` from resetting to `undefined` during refetches
- **feat(retry):** Configurable retry orchestration with fixed and exponential backoff strategies
- **feat(config):** `provideResourcePlus()` — global configuration via Angular dependency injection
- **feat(testing):** `createMockResourcePlus()` — testing harness in `ngx-resource-plus/testing` secondary entry point

#### Performance

- **perf(core):** `sideEffects: false` — fully tree-shakeable, unused features are eliminated at build time

---

## License

[MIT](LICENSE)
