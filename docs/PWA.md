# NIRWARE NEXT — Progressive Web App (PWA) Architecture

## 1. Overview

NIRWARE NEXT includes full **Progressive Web App (PWA)** support in `apps/web`. It allows factory scale operators, weighbridge staff, and farm supervisors to run the system reliably in low-connectivity or intermittent offline warehouse and agricultural environments.

---

## 2. PWA Features & Manifest

### 2.1 Manifest Configuration (`public/manifest.json`)
- **Display Mode**: `standalone` (removes browser navigation chrome, providing a native app experience).
- **Direction**: `rtl` (Persian right-to-left UI by default).
- **Theme Color**: Emerald green (`#16a34a`).
- **Icons**: Standard PWA icon set (192x192, 512x512) for home screen installation on iOS, Android, and Windows desktop.

### 2.2 Service Worker (`public/sw.js`)
- **Pre-caching**: Static bundle assets (JS, CSS, HTML, Web Fonts) are cached on install.
- **Cache-First Strategy**: Assets and UI shell are served immediately from cache for near-instant load times.
- **Network-First Strategy**: Dynamic `/api/v1` data queries attempt fresh network fetch and fall back to cache when offline.

---

## 3. Offline Mutation Queue (`src/pwa/offline-queue.ts`)

When a user attempts a state change (such as submitting an order, confirming a scale weighing, or recording daily flock mortality) without an internet connection:

1. **Interception**: The mutation is captured and assigned a unique client UUID (`Idempotency-Key`).
2. **Persistent Storage**: The mutation payload, HTTP method, timestamp, and target endpoint are serialized into persistent browser storage.
3. **Optimistic UI**: The interface reflects the requested action immediately.
4. **Automatic Replay**: When the browser fires the `window.addEventListener('online')` event:
   - `OfflineQueueManager.processQueue()` iterates through pending mutations.
   - Each mutation is replayed against the server with its original `Idempotency-Key` header.
   - The backend `idempotencyMiddleware` guarantees that even if a network request was previously received before the client lost connection, the operation will not be duplicated.
   - TanStack Query invalidates active caches to synchronize the live state.
