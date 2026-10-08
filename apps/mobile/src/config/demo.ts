/**
 * NIRWARE NEXT Mobile - Demo & Local UI Preview Configuration
 *
 * Provides a clean, isolated mode for local UI preview and functionality testing
 * without requiring a live backend, database, or network connection.
 */
import { StorageService } from '../services/storage.service';

// Default from environment variable (EXPO_PUBLIC_DEMO_MODE=true)
const envDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

let activeDemoMode: boolean = envDemoMode;

export const isDemoModeActive = (): boolean => {
  return activeDemoMode;
};

export const setDemoModeActive = (enabled: boolean): void => {
  activeDemoMode = enabled;
};

export const initDemoMode = async (): Promise<boolean> => {
  try {
    const override = await StorageService.getDemoModeOverride();
    if (override !== null) {
      activeDemoMode = override;
    } else {
      activeDemoMode = envDemoMode;
    }
  } catch {
    activeDemoMode = envDemoMode;
  }
  return activeDemoMode;
};

export const toggleDemoMode = async (enable: boolean): Promise<boolean> => {
  activeDemoMode = enable;
  await StorageService.setDemoModeOverride(enable);
  return activeDemoMode;
};
