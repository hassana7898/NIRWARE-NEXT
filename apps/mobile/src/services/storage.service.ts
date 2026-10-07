/**
 * Secure Storage Service for Mobile Credentials & Offline Cache
 * Utilizes expo-secure-store with safe fallback for headless/web runs
 */

let memoryStorage: Record<string, string> = {};

export class StorageService {
  public static async setItem(key: string, value: string): Promise<void> {
    try {
      // Dynamic import of expo-secure-store if available
      // @ts-ignore
      const SecureStore = await import('expo-secure-store');
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch {}

    memoryStorage[key] = value;
  }

  public static async getItem(key: string): Promise<string | null> {
    try {
      // @ts-ignore
      const SecureStore = await import('expo-secure-store');
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const val = await SecureStore.getItemAsync(key);
        if (val) return val;
      }
    } catch {}

    return memoryStorage[key] || null;
  }

  public static async removeItem(key: string): Promise<void> {
    try {
      // @ts-ignore
      const SecureStore = await import('expo-secure-store');
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(key);
        return;
      }
    } catch {}

    delete memoryStorage[key];
  }

  public static async saveSession(token: string, user: any): Promise<void> {
    await this.setItem('nirware_token', token);
    await this.setItem('nirware_user', JSON.stringify(user));
  }

  public static async getSession(): Promise<{ token: string; user: any } | null> {
    const token = await this.getItem('nirware_token');
    const userJson = await this.getItem('nirware_user');
    if (!token || !userJson) return null;
    try {
      return { token, user: JSON.parse(userJson) };
    } catch {
      return null;
    }
  }

  public static async clearSession(): Promise<void> {
    await this.removeItem('nirware_token');
    await this.removeItem('nirware_user');
  }
}
