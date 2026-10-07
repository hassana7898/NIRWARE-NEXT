/**
 * Hardware Location Service for GPS Fleet Telemetry
 * Integrates with expo-location with privacy-conscious permissions
 */

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export class LocationService {
  private static isTracking = false;

  public static async requestPermission(): Promise<boolean> {
    try {
      // @ts-ignore
      const Location = await import('expo-location');
      if (Location && typeof Location.requestForegroundPermissionsAsync === 'function') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === 'granted';
      }
    } catch {
      // Hardware location unavailable
    }
    return false;
  }

  public static async getCurrentLocation(): Promise<GpsCoordinates | null> {
    try {
      // @ts-ignore
      const Location = await import('expo-location');
      if (Location && typeof Location.getCurrentPositionAsync === 'function') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        return {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || undefined,
          timestamp: loc.timestamp || Date.now(),
        };
      }
    } catch {
      // Error fetching location
    }

    // Zero fake coordinates in production: return null if hardware GPS unavailable
    return null;
  }

  public static startTracking(onUpdate: (coords: GpsCoordinates) => void): void {
    this.isTracking = true;
    const poll = async () => {
      if (!this.isTracking) return;
      const coords = await this.getCurrentLocation();
      if (coords) onUpdate(coords);
      setTimeout(poll, 15000); // 15 seconds fleet ping
    };
    poll();
  }

  public static stopTracking(): void {
    this.isTracking = false;
  }
}
