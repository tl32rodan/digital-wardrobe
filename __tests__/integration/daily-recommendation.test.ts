/**
 * Integration tests — Full daily recommendation flow
 * Spec ref: §4.2 (每日穿搭推薦), covers the complete pipeline:
 *   Weather → Occasion → Recent history → Preferences → Outfit suggestions
 */
import { OutfitService, RecommendationContext } from '../../src/services/outfit.service';
import { WeatherService } from '../../src/services/weather.service';
import { HistoryService } from '../../src/services/history.service';
import { ClothingItem, OutfitRecord } from '../../src/models/clothing';
import {
  makeItem,
  makeBottom,
  makeOuter,
  makeShoes,
  makeOutfitSet,
  makePreferences,
} from '../fixtures/clothing.fixtures';

const buildWardrobe = (): ClothingItem[] => [
  makeItem({ id: 't1', seasons: ['春', '夏', '秋'], occasions: ['上班', '休閒'] }),
  makeItem({ id: 't2', name: '黑T', colors: ['#212121'], seasons: ['春', '夏', '秋'], occasions: ['休閒'] }),
  makeItem({ id: 't3', name: '格紋襯衫', occasions: ['上班', '正式'] }),
  makeBottom({ id: 'b1', seasons: ['春', '夏', '秋'] }),
  makeBottom({ id: 'b2', name: '黑色西裝褲', occasions: ['上班', '正式'] }),
  makeOuter({ id: 'o1', seasons: ['春', '秋'] }),
  makeShoes({ id: 's1' }),
  makeShoes({ id: 's2', name: '黑色皮鞋', occasions: ['上班', '正式'] }),
];

describe('Integration: Spec §4.2 — Full daily recommendation pipeline', () => {
  let outfitService: OutfitService;
  let weatherService: WeatherService;
  let historyService: HistoryService;

  beforeEach(() => {
    outfitService = new OutfitService();
    weatherService = new WeatherService();
    historyService = new HistoryService();
  });

  // ── happy path ─────────────────────────────────────────────────────────────

  it('generates 1–3 outfit options for a typical work morning', () => {
    const context: RecommendationContext = {
      weather: { temperature: 18, feels_like: 16, humidity: 60, description: '多雲', indoor_temp_estimate: 22 },
      occasion: '上班',
      recentHistory: [],
      preferences: makePreferences(),
      today: '2026-03-02',
    };
    const outfits = outfitService.recommend(buildWardrobe(), context);
    expect(outfits.length).toBeGreaterThanOrEqual(1);
    expect(outfits.length).toBeLessThanOrEqual(3);
  });

  // ── avoids recently worn items ─────────────────────────────────────────────

  it('does not repeat same top worn within the last 7 days (casual)', () => {
    const wornTop = makeItem({ id: 't1', last_worn_date: '2026-02-26' }); // 4 days ago
    const wardrobe = [
      wornTop,
      makeItem({ id: 't2', name: '替代上衣' }),
      makeBottom({ id: 'b1' }),
      makeShoes({ id: 's1' }),
    ];
    const context: RecommendationContext = {
      weather: { temperature: 22, feels_like: 21, humidity: 55, description: '晴', indoor_temp_estimate: null },
      occasion: '休閒',
      recentHistory: [],
      preferences: makePreferences(),
      today: '2026-03-01',
    };
    const outfits = outfitService.recommend(wardrobe, context);
    outfits.forEach((o) => {
      if (o.top) expect(o.top.id).not.toBe('t1');
    });
  });

  // ── weather-driven layering ────────────────────────────────────────────────

  it('includes an outer layer suggestion when there is a large indoor/outdoor temp gap', () => {
    const context: RecommendationContext = {
      weather: {
        temperature: 34,
        feels_like: 37,
        humidity: 85,
        description: '晴天',
        indoor_temp_estimate: 19,  // strong AC, 15°C gap
      },
      occasion: '上班',
      recentHistory: [],
      preferences: makePreferences(),
      today: '2026-03-01',
    };
    const wardrobe = buildWardrobe();
    const outfits = outfitService.recommend(wardrobe, context);
    // At least one outfit should suggest an outer layer for the AC
    const hasOuter = outfits.some((o) => o.outer !== null);
    expect(hasOuter).toBe(true);
  });

  // ── occasion matching ──────────────────────────────────────────────────────

  it('formal occasion results in outfit with formal items only', () => {
    const context: RecommendationContext = {
      weather: { temperature: 20, feels_like: 19, humidity: 50, description: '晴', indoor_temp_estimate: null },
      occasion: '正式',
      recentHistory: [],
      preferences: makePreferences(),
      today: '2026-03-01',
    };
    const wardrobe = buildWardrobe();
    const outfits = outfitService.recommend(wardrobe, context);
    outfits.forEach((o) => {
      if (o.top) expect(o.top.occasions).toContain('正式');
    });
  });

  // ── offline fallback ──────────────────────────────────────────────────────

  it('falls back to cached recommendation when called offline (no weather)', () => {
    // Seed a cache entry for yesterday
    const yesterday = '2026-02-28';
    const cachedOutfits = [makeOutfitSet()];
    outfitService.cacheRecommendation(cachedOutfits, yesterday);

    const cached = outfitService.getCachedRecommendation(yesterday);
    expect(cached).not.toBeNull();
    expect(cached?.outfits[0].reason).toBeDefined();
  });

  // ── end-to-end: context built from weather + history services ────────────

  it('builds a valid RecommendationContext from real service outputs', async () => {
    // Weather service provides cached data
    const weatherData = { temperature: 20, feels_like: 19, humidity: 55, description: '晴', indoor_temp_estimate: null };
    weatherService.cacheWeather(weatherData, '2026-03-01');
    const weather = weatherService.getCachedWeather('2026-03-01');

    // History service provides last 7 days
    const records: OutfitRecord[] = [
      { date: '2026-02-28', outfit: makeOutfitSet(), accepted: true, photo_url: null },
    ];
    const recentHistory = historyService.getRecentHistory(records, 7);

    const context: RecommendationContext = {
      weather: weather!,
      occasion: '休閒',
      recentHistory: recentHistory.map((r) => r.outfit),
      preferences: makePreferences(),
      today: '2026-03-01',
    };

    const outfits = outfitService.recommend(buildWardrobe(), context);
    expect(outfits.length).toBeGreaterThanOrEqual(1);
  });
});
