/**
 * Hardware-Backed Secure Storage Service for Mobile Credentials
 * Strictly enforces expo-secure-store; fails closed without insecure memory fallback.
 */

export class StorageService {
  private static async getSecureStore() {
    try {
      // @ts-ignore
      const SecureStore = await import('expo-secure-store');
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        return SecureStore;
      }
    } catch {}
    return null;
  }

  public static async setItem(key: string, value: string): Promise<void> {
    const SecureStore = await this.getSecureStore();
    if (!SecureStore) {
      throw new Error('SECURE_STORAGE_UNAVAILABLE: Hardware-backed secure storage is required for mobile security.');
    }
    await SecureStore.setItemAsync(key, value);
  }

  public static async getItem(key: string): Promise<string | null> {
    const SecureStore = await this.getSecureStore();
    if (!SecureStore) {
      return null;
    }
    return await SecureStore.getItemAsync(key);
  }

  public static async removeItem(key: string): Promise<void> {
    const SecureStore = await this.getSecureStore();
    if (!SecureStore) {
      return;
    }
    await SecureStore.deleteItemAsync(key);
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

  public static async getCustomApiUrl(): Promise<string | null> {
    return await this.getItem('nirware_custom_api_url');
  }

  public static async setCustomApiUrl(url: string | null): Promise<void> {
    if (url && url.trim()) {
      await this.setItem('nirware_custom_api_url', url.trim());
    } else {
      await this.removeItem('nirware_custom_api_url');
    }
  }

  public static async getDemoModeOverride(): Promise<boolean | null> {
    const val = await this.getItem('nirware_demo_mode_override');
    if (val === 'true') return true;
    if (val === 'false') return false;
    return null;
  }

  public static async setDemoModeOverride(enabled: boolean | null): Promise<void> {
    if (enabled === true) {
      await this.setItem('nirware_demo_mode_override', 'true');
    } else if (enabled === false) {
      await this.setItem('nirware_demo_mode_override', 'false');
    } else {
      await this.removeItem('nirware_demo_mode_override');
    }
  }
}
