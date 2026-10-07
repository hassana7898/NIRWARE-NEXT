/**
 * Offline Mutation Queue & Sync Manager
 * Supports offline creation of Daily Records and Orders,
 * synchronizing with the server idempotently upon reconnection.
 */

export interface QueuedMutation {
  id: string; // Idempotency key
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  body: any;
  createdAt: number;
  retries: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  lastError?: string;
}

const STORAGE_KEY = 'nirware_offline_mutation_queue';

export class OfflineQueueManager {
  private static getQueue(): QueuedMutation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private static saveQueue(queue: QueuedMutation[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  public static enqueue(endpoint: string, body: any, method: 'POST' | 'PUT' | 'PATCH' = 'POST'): string {
    const queue = this.getQueue();
    const id = `offline-${Date.now()}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`;
    const mutation: QueuedMutation = {
      id,
      endpoint,
      method,
      body,
      createdAt: Date.now(),
      retries: 0,
      status: 'PENDING',
    };
    queue.push(mutation);
    this.saveQueue(queue);
    window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    return id;
  }

  public static getPendingCount(): number {
    return this.getQueue().filter((m) => m.status === 'PENDING').length;
  }

  public static async processQueue(
    clientRequest: (endpoint: string, options: any) => Promise<any>
  ): Promise<{ syncedCount: number; errors: number }> {
    const queue = this.getQueue();
    let syncedCount = 0;
    let errors = 0;

    const remaining: QueuedMutation[] = [];

    for (const item of queue) {
      if (item.status === 'SYNCING') continue;

      try {
        item.status = 'SYNCING';
        this.saveQueue(queue);

        await clientRequest(item.endpoint, {
          method: item.method,
          body: item.body,
          headers: {
            'Idempotency-Key': item.id,
          },
        });

        syncedCount++;
      } catch (err: any) {
        errors++;
        item.status = 'PENDING';
        item.retries += 1;
        item.lastError = err?.message || 'Sync failed';
        remaining.push(item);
      }
    }

    this.saveQueue(remaining);
    window.dispatchEvent(new CustomEvent('offline-queue-updated'));
    return { syncedCount, errors };
  }
}
