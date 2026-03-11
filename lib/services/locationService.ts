// Location Service with Haversine Distance Calculation

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  accuracy: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export class LocationService {
  private static readonly EARTH_RADIUS_KM = 6371;
  private static readonly GEOFENCE_RADIUS_METERS = 30;

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const lat1Rad = this.toRadians(coord1.latitude);
    const lat2Rad = this.toRadians(coord2.latitude);
    const deltaLat = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLon = this.toRadians(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = this.EARTH_RADIUS_KM * c;
    const distanceMeters = distanceKm * 1000;

    return Math.round(distanceMeters * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Check if student is within geofence radius
   */
  static isWithinGeofence(
    studentLocation: Coordinates,
    classroomLocation: Coordinates,
    radiusMeters: number = this.GEOFENCE_RADIUS_METERS
  ): boolean {
    const distance = this.calculateDistance(studentLocation, classroomLocation);
    return distance <= radiusMeters;
  }

  /**
   * Get current location from browser
   */
  static async getCurrentLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Watch location changes
   */
  static watchLocation(
    onLocationUpdate: (location: LocationData) => void,
    onError: (error: Error) => void
  ): number {
    if (!navigator.geolocation) {
      onError(new Error('Geolocation is not supported'));
      return -1;
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        onLocationUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        onError(new Error(`Location error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  /**
   * Stop watching location
   */
  static clearWatch(watchId: number): void {
    if (navigator.geolocation && watchId !== -1) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Validate location data
   */
  static isValidLocation(location: Coordinates): boolean {
    return (
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }

  /**
   * Get location status message
   */
  static getLocationStatus(distance: number): {
    status: 'in_range' | 'out_of_range' | 'far';
    message: string;
    color: string;
  } {
    if (distance <= this.GEOFENCE_RADIUS_METERS) {
      return {
        status: 'in_range',
        message: `Within classroom range (${this.formatDistance(distance)})`,
        color: 'green',
      };
    } else if (distance <= 100) {
      return {
        status: 'out_of_range',
        message: `Outside classroom range (${this.formatDistance(distance)})`,
        color: 'orange',
      };
    } else {
      return {
        status: 'far',
        message: `Too far from classroom (${this.formatDistance(distance)})`,
        color: 'red',
      };
    }
  }

  /**
   * Calculate bearing between two points
   */
  static calculateBearing(from: Coordinates, to: Coordinates): number {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = Math.atan2(y, x);
    const bearingDegrees = this.toDegrees(bearing);

    return (bearingDegrees + 360) % 360;
  }

  /**
   * Get compass direction from bearing
   */
  static getCompassDirection(bearing: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * Get device location info
   */
  static getDeviceInfo(): {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  } {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
    };
  }
}
