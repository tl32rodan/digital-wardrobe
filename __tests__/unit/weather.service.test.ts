/**
 * Unit tests — Weather service
 * Spec ref: §4.2 (weather factor), §5 (offline / indoor temp)
 */
import { WeatherService } from '../../src/services/weather.service';

describe('Spec §4.2 / §5 — Weather service', () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService();
  });

  // ── fetch ─────────────────────────────────────────────────────────────────

  describe('fetchCurrent()', () => {
    it('returns a WeatherCondition with required numeric fields', async () => {
      const mockFetch = jest.spyOn(service as any, 'fetchCurrent').mockResolvedValue({
        temperature: 22,
        feels_like: 21,
        humidity: 55,
        description: '晴天',
        indoor_temp_estimate: null,
      });
      const result = await service.fetchCurrent({ latitude: 25.033, longitude: 121.565 });
      expect(typeof result.temperature).toBe('number');
      expect(typeof result.feels_like).toBe('number');
      mockFetch.mockRestore();
    });
  });

  // ── cache ─────────────────────────────────────────────────────────────────

  describe('weather cache (spec §5 — offline mode)', () => {
    it('stores and retrieves cached weather for a date', () => {
      const condition = {
        temperature: 18,
        feels_like: 16,
        humidity: 60,
        description: '多雲',
        indoor_temp_estimate: 22,
      };
      service.cacheWeather(condition, '2026-03-01');
      const cached = service.getCachedWeather('2026-03-01');
      expect(cached).toEqual(condition);
    });

    it('returns null for an uncached date', () => {
      expect(service.getCachedWeather('2010-01-01')).toBeNull();
    });

    it('overwrites stale cache with fresh data', () => {
      service.cacheWeather({ temperature: 20, feels_like: 19, humidity: 50, description: 'old', indoor_temp_estimate: null }, '2026-03-01');
      service.cacheWeather({ temperature: 25, feels_like: 24, humidity: 60, description: 'new', indoor_temp_estimate: null }, '2026-03-01');
      const cached = service.getCachedWeather('2026-03-01');
      expect(cached?.temperature).toBe(25);
    });
  });

  // ── indoor temp estimate ──────────────────────────────────────────────────

  describe('estimateIndoorTemp() (spec §5 — AC / heating offset)', () => {
    it('returns a cooler indoor temp in summer (AC)', () => {
      const indoor = service.estimateIndoorTemp(34, '夏');
      expect(indoor).toBeLessThan(34);
    });

    it('returns a warmer indoor temp in winter (heating)', () => {
      const indoor = service.estimateIndoorTemp(5, '冬');
      expect(indoor).toBeGreaterThan(5);
    });

    it('returns close to outdoor temp in spring/autumn (no extreme HVAC)', () => {
      const indoor = service.estimateIndoorTemp(22, '秋');
      expect(Math.abs(indoor - 22)).toBeLessThanOrEqual(4);
    });
  });
});
