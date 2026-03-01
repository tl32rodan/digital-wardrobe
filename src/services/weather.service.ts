// Stub — implementation intentionally absent (TDD red phase)
import { WeatherCondition } from '../models/clothing';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export class WeatherService {
  /**
   * Spec §4.2 — fetch weather by geolocation
   */
  fetchCurrent(_location: GeoLocation): Promise<WeatherCondition> {
    throw new Error('Not implemented');
  }

  /**
   * Spec §5 — cache today's weather for offline use
   */
  cacheWeather(_condition: WeatherCondition, _date: string): void {
    throw new Error('Not implemented');
  }

  /**
   * Spec §5 — retrieve cached weather when offline
   */
  getCachedWeather(_date: string): WeatherCondition | null {
    throw new Error('Not implemented');
  }

  /**
   * Spec §5 — estimate indoor temp given outdoor temp
   * (office AC in summer, heating in winter)
   */
  estimateIndoorTemp(_outdoorTemp: number, _season: string): number {
    throw new Error('Not implemented');
  }
}
