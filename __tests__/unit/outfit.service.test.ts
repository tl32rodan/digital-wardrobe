/**
 * Unit tests — Daily outfit recommendation
 * Spec ref: §4.2 (每日穿搭推薦), §5 (edge cases)
 */
import { OutfitService, RecommendationContext } from '../../src/services/outfit.service';
import { ClothingItem, WeatherCondition } from '../../src/models/clothing';
import {
  makeItem,
  makeBottom,
  makeOuter,
  makeShoes,
  makeOutfitSet,
  makePreferences,
} from '../fixtures/clothing.fixtures';

const makeCoolWeather = (overrides: Partial<WeatherCondition> = {}): WeatherCondition => ({
  temperature: 18,
  feels_like: 16,
  humidity: 60,
  description: '多雲',
  indoor_temp_estimate: 22,
  ...overrides,
});

const makeHotWeather = (overrides: Partial<WeatherCondition> = {}): WeatherCondition => ({
  temperature: 34,
  feels_like: 37,
  humidity: 85,
  description: '晴天',
  indoor_temp_estimate: 20,   // AC office
  ...overrides,
});

const makeWardrobe = (): ClothingItem[] => [
  makeItem({ id: 't1' }),
  makeItem({ id: 't2', colors: ['#000000'], name: '黑色T-shirt' }),
  makeBottom({ id: 'b1' }),
  makeBottom({ id: 'b2', colors: ['#333333'], name: '黑色卡其褲' }),
  makeOuter({ id: 'o1' }),
  makeShoes({ id: 's1' }),
];

describe('Spec §4.2 — Daily outfit recommendation', () => {
  let service: OutfitService;

  beforeEach(() => {
    service = new OutfitService();
  });

  // ── number of recommendations ─────────────────────────────────────────────

  describe('number of recommendations', () => {
    it('returns 1 to 3 outfit options', () => {
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: makePreferences(),
        today: '2026-03-01',
      };
      const outfits = service.recommend(makeWardrobe(), context);
      expect(outfits.length).toBeGreaterThanOrEqual(1);
      expect(outfits.length).toBeLessThanOrEqual(3);
    });

    it('each outfit has a one-line reason', () => {
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: makePreferences(),
        today: '2026-03-01',
      };
      const outfits = service.recommend(makeWardrobe(), context);
      outfits.forEach((o) => {
        expect(typeof o.reason).toBe('string');
        expect(o.reason.length).toBeGreaterThan(0);
      });
    });
  });

  // ── status filter ─────────────────────────────────────────────────────────

  describe('only recommends available items', () => {
    it('excludes items in laundry', () => {
      const wardrobe = makeWardrobe();
      wardrobe.forEach((i) => { if (i.category === 'top') i.status = 'laundry'; });
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: makePreferences(),
        today: '2026-03-01',
      };
      const outfits = service.recommend(wardrobe, context);
      outfits.forEach((o) => {
        if (o.top) expect(o.top.status).toBe('available');
      });
    });

    it('excludes retired items', () => {
      const retiredTop = makeItem({ id: 'retired-top', status: 'retired' });
      const wardrobe = [retiredTop, ...makeWardrobe()];
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: makePreferences(),
        today: '2026-03-01',
      };
      const outfits = service.recommend(wardrobe, context);
      outfits.forEach((o) => {
        if (o.top) expect(o.top.id).not.toBe('retired-top');
      });
    });

    it('excludes archived items (seasonal storage)', () => {
      // archived = seasonally stored, should not appear in recommendations
      const archivedTop = makeItem({ id: 'archived-top', status: 'archived' });
      const wardrobe = [archivedTop, ...makeWardrobe()];
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: makePreferences(),
        today: '2026-03-01',
      };
      const outfits = service.recommend(wardrobe, context);
      outfits.forEach((o) => {
        if (o.top) expect(o.top.id).not.toBe('archived-top');
      });
    });
  });

  // ── repeat-interval filter ────────────────────────────────────────────────

  describe('filterByRepeatInterval() (spec §5)', () => {
    it('casual occasion: excludes items worn within 7 days', () => {
      const item = makeItem({ id: 'worn-recently', last_worn_date: '2026-02-28' }); // 1 day ago
      const result = service.filterByRepeatInterval(
        [item],
        [],
        makePreferences(),
        '2026-03-01',
        '休閒',
      );
      expect(result.find((i) => i.id === 'worn-recently')).toBeUndefined();
    });

    it('casual occasion: includes items worn exactly 7 days ago', () => {
      const item = makeItem({ id: 'just-eligible', last_worn_date: '2026-02-22' }); // 7 days ago
      const result = service.filterByRepeatInterval(
        [item],
        [],
        makePreferences(),
        '2026-03-01',
        '休閒',
      );
      expect(result.find((i) => i.id === 'just-eligible')).toBeDefined();
    });

    it('formal occasion: excludes items worn within 14 days', () => {
      const item = makeItem({ id: 'worn-10d', last_worn_date: '2026-02-19' }); // 10 days ago
      const result = service.filterByRepeatInterval(
        [item],
        [],
        makePreferences(),
        '2026-03-01',
        '正式',
      );
      expect(result.find((i) => i.id === 'worn-10d')).toBeUndefined();
    });

    it('home occasion: no repeat interval restriction', () => {
      const item = makeItem({ id: 'worn-yesterday', last_worn_date: '2026-02-28', occasions: ['居家'] });
      const result = service.filterByRepeatInterval(
        [item],
        [],
        makePreferences(),
        '2026-03-01',
        '居家',
      );
      expect(result.find((i) => i.id === 'worn-yesterday')).toBeDefined();
    });
  });

  // ── weather / layering ────────────────────────────────────────────────────

  describe('suggestLayering() (spec §5 — indoor/outdoor temp diff)', () => {
    it('suggests an outer layer when outdoor is hot but indoor is cold (AC gap)', () => {
      const hotWithAC = makeHotWeather({ temperature: 34, indoor_temp_estimate: 20 });
      const outers = [makeOuter({ id: 'thin-jacket', seasons: ['夏'] })];
      const suggestion = service.suggestLayering(hotWithAC, outers);
      expect(suggestion).not.toBeNull();
      expect(suggestion?.category).toBe('outer');
    });

    it('does not suggest outer when indoor and outdoor temps are similar', () => {
      const mild = makeCoolWeather({ temperature: 22, indoor_temp_estimate: 22 });
      const outers = [makeOuter()];
      const suggestion = service.suggestLayering(mild, outers);
      expect(suggestion).toBeNull();
    });

    it('suggests outer for cold weather regardless of indoor temp', () => {
      const cold = makeCoolWeather({ temperature: 8, indoor_temp_estimate: 20 });
      const outers = [makeOuter({ id: 'warm-jacket', seasons: ['冬'] })];
      const suggestion = service.suggestLayering(cold, outers);
      expect(suggestion).not.toBeNull();
    });
  });

  // ── disliked elements ─────────────────────────────────────────────────────

  describe('respects disliked_elements from preferences', () => {
    it('excludes items matching a disliked element note', () => {
      const fluorescent = makeItem({
        id: 'neon',
        colors: ['#FF00FF'],
        notes: '螢光色系單品',
      });
      const wardrobe = [fluorescent, makeItem({ id: 'normal' }), makeBottom(), makeShoes()];
      const prefs = makePreferences({ disliked_elements: ['螢光色'] });
      const context: RecommendationContext = {
        weather: makeCoolWeather(),
        occasion: '休閒',
        recentHistory: [],
        preferences: prefs,
        today: '2026-03-01',
      };
      const outfits = service.recommend(wardrobe, context);
      outfits.forEach((o) => {
        if (o.top) expect(o.top.id).not.toBe('neon');
      });
    });
  });

  // ── offline / cache ───────────────────────────────────────────────────────

  describe('offline mode (spec §5)', () => {
    it('cacheRecommendation stores outfits for a date', () => {
      const outfits = [makeOutfitSet()];
      expect(() => service.cacheRecommendation(outfits, '2026-03-01')).not.toThrow();
    });

    it('getCachedRecommendation returns stored outfits for the same date', () => {
      const outfits = [makeOutfitSet()];
      service.cacheRecommendation(outfits, '2026-03-01');
      const cached = service.getCachedRecommendation('2026-03-01');
      expect(cached).not.toBeNull();
      expect(cached?.outfits).toHaveLength(1);
    });

    it('getCachedRecommendation returns null for an uncached date', () => {
      const cached = service.getCachedRecommendation('2020-01-01');
      expect(cached).toBeNull();
    });
  });
});
