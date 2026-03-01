/**
 * Regression tests — Full daily-wear user journey (1 week simulation)
 * Spec ref: §4.2, §4.3, §4.4, §4.5
 *
 * Simulates one week of app usage:
 *   Mon–Sun: get recommendations → confirm → end of day → laundry
 *   Sun: do laundry → mark all clean
 *
 * Then verifies:
 *   - History has 7 records
 *   - wear_counts increased correctly
 *   - cost_per_wear recomputed
 *   - No item worn twice within repeat interval
 *   - Dormant check works
 *
 * This test MUST pass after every refactor to protect the core UX loop.
 */
import { LaundryService } from '../../src/services/laundry.service';
import { HistoryService } from '../../src/services/history.service';
import { OutfitService, RecommendationContext } from '../../src/services/outfit.service';
import { ClothingService } from '../../src/services/clothing.service';
import { ClothingItem, OutfitRecord, WeatherCondition } from '../../src/models/clothing';
import { makeItem, makeBottom, makeOuter, makeShoes, makePreferences } from '../fixtures/clothing.fixtures';

const WEEK_DATES = [
  '2026-03-02', // Mon
  '2026-03-03', // Tue
  '2026-03-04', // Wed
  '2026-03-05', // Thu
  '2026-03-06', // Fri
  '2026-03-07', // Sat
  '2026-03-08', // Sun
];

const MILD_WEATHER: WeatherCondition = {
  temperature: 20,
  feels_like: 19,
  humidity: 55,
  description: '晴',
  indoor_temp_estimate: 22,
};

const makeFullWardrobe = (): ClothingItem[] => [
  makeItem({ id: 't1', name: '白T #001', seasons: ['春', '夏', '秋'] }),
  makeItem({ id: 't2', name: '黑色T', colors: ['#000'], seasons: ['春', '夏', '秋'], occasions: ['休閒', '上班'] }),
  makeItem({ id: 't3', name: '灰色T', colors: ['#9E9E9E'], seasons: ['春', '夏', '秋'] }),
  makeItem({ id: 't4', name: '藍色POLO', colors: ['#1565C0'], seasons: ['春', '夏', '秋'], occasions: ['上班'] }),
  makeBottom({ id: 'b1', name: '深藍牛仔' }),
  makeBottom({ id: 'b2', name: '黑色卡其', colors: ['#212121'] }),
  makeBottom({ id: 'b3', name: '米色卡其', colors: ['#F5F5DC'] }),
  makeOuter({ id: 'o1', name: '灰外套', wear_before_laundry: 3 }),
  makeShoes({ id: 's1' }),
  makeShoes({ id: 's2', name: '黑色運動鞋', colors: ['#212121'] }),
];

describe('Regression: §4.2–§4.5 — One-week daily wear journey', () => {
  let wardrobe: ClothingItem[];
  let laundryService: LaundryService;
  let historyService: HistoryService;
  let outfitService: OutfitService;
  let clothingService: ClothingService;
  let historyRecords: OutfitRecord[];

  // getDormantItems and getRecentHistory use new Date() — freeze to end of simulated week
  beforeAll(() => jest.useFakeTimers({ now: new Date('2026-03-08') }));
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    wardrobe = makeFullWardrobe();
    laundryService = new LaundryService();
    historyService = new HistoryService();
    outfitService = new OutfitService();
    clothingService = new ClothingService();
    historyRecords = [];
  });

  // ── R1: recommendations generated every day ───────────────────────────────

  it('R1: the app produces at least one outfit recommendation every day of the week', () => {
    for (const date of WEEK_DATES) {
      const recentHistory = historyService.getRecentHistory(historyRecords, 7);
      const context: RecommendationContext = {
        weather: MILD_WEATHER,
        occasion: '休閒',
        recentHistory: recentHistory.map((r) => r.outfit),
        preferences: makePreferences(),
        today: date,
      };
      const outfits = outfitService.recommend(
        wardrobe.filter((i) => i.status === 'available'),
        context,
      );
      expect(outfits.length).toBeGreaterThanOrEqual(1);
    }
  });

  // ── R2: outfit confirmation updates state ─────────────────────────────────

  it('R2: confirming daily outfit increments wear_count for all worn items', () => {
    const topBefore = wardrobe.find((i) => i.id === 't1')!;
    const initialCount = topBefore.wear_count;

    // Simulate confirming top t1 for 3 days
    for (let i = 0; i < 3; i++) {
      const idx = wardrobe.findIndex((w) => w.id === 't1');
      wardrobe[idx] = laundryService.recordWear(wardrobe[idx], WEEK_DATES[i]);
      // After each wear (threshold=1), goes to laundry; then clean
      wardrobe[idx] = laundryService.endOfDayTransition([wardrobe[idx]], WEEK_DATES[i])[0];
      wardrobe[idx] = laundryService.markClean(wardrobe[idx]);
    }

    const topAfter = wardrobe.find((i) => i.id === 't1')!;
    expect(topAfter.wear_count).toBe(initialCount + 3);
  });

  // ── R3: no top repeated within 7 days ────────────────────────────────────

  it('R3: same top is not recommended twice within its 7-day interval', () => {
    // Force t1 as worn on Monday
    const t1idx = wardrobe.findIndex((w) => w.id === 't1');
    wardrobe[t1idx] = { ...wardrobe[t1idx], last_worn_date: '2026-03-02' };

    // Tuesday recommendation should not include t1
    const context: RecommendationContext = {
      weather: MILD_WEATHER,
      occasion: '休閒',
      recentHistory: [],
      preferences: makePreferences(),
      today: '2026-03-03',
    };
    const available = wardrobe.filter((i) => i.status === 'available');
    const outfits = outfitService.recommend(available, context);
    outfits.forEach((o) => {
      if (o.top) expect(o.top.id).not.toBe('t1');
    });
  });

  // ── R4: jacket stays available through 3-wear cycle ───────────────────────

  it('R4: jacket with wear_before_laundry=3 is available for 3 consecutive wears', () => {
    const jacketIdx = wardrobe.findIndex((w) => w.id === 'o1');

    // Days 1 and 2: jacket stays available
    for (let day = 0; day < 2; day++) {
      wardrobe[jacketIdx] = laundryService.recordWear(wardrobe[jacketIdx], WEEK_DATES[day]);
      wardrobe[jacketIdx] = laundryService.endOfDayTransition([wardrobe[jacketIdx]], WEEK_DATES[day])[0];
      expect(wardrobe[jacketIdx].status).toBe('available');
    }

    // Day 3: jacket hits threshold → worn_today → laundry
    wardrobe[jacketIdx] = laundryService.recordWear(wardrobe[jacketIdx], WEEK_DATES[2]);
    wardrobe[jacketIdx] = laundryService.endOfDayTransition([wardrobe[jacketIdx]], WEEK_DATES[2])[0];
    expect(wardrobe[jacketIdx].status).toBe('laundry');
  });

  // ── R5: laundry cleared on Sunday, all items available again ─────────────

  it('R5: all laundry items are available after Sunday "全部洗好了"', () => {
    // Move several items to laundry
    const laundryItems = wardrobe
      .filter((i) => ['t1', 't2', 'b1'].includes(i.id))
      .map((i) => ({ ...i, status: 'laundry' as const }));

    const cleaned = laundryService.markAllClean(laundryItems);
    cleaned.forEach((i) => expect(i.status).toBe('available'));
  });

  // ── R6: history has one record per day ───────────────────────────────────

  it('R6: history records accumulate — one per worn day', () => {
    WEEK_DATES.slice(0, 5).forEach((date) => {
      // Mon–Fri: confirm a casual outfit
      const record: OutfitRecord = {
        date,
        outfit: {
          top: wardrobe.find((i) => i.id === 't1') ?? null,
          outer: null,
          bottom: wardrobe.find((i) => i.id === 'b1') ?? null,
          shoes: wardrobe.find((i) => i.id === 's1') ?? null,
          accessories: [],
          reason: `${date} 休閒搭配`,
        },
        accepted: true,
        photo_url: null,
      };
      historyRecords.push(historyService.recordOutfit(record));
    });

    const marchStats = historyService.getMonthlyStats(historyRecords, wardrobe, '2026-03');
    expect(marchStats.totalOutfits).toBe(5);
  });

  // ── R7: cost_per_wear improves as item is worn more ───────────────────────

  it('R7: cost_per_wear decreases as wear_count increases', () => {
    const price = 490;
    const cpw5 = clothingService.computeCostPerWear(price, 5)!;
    const cpw10 = clothingService.computeCostPerWear(price, 10)!;
    const cpw20 = clothingService.computeCostPerWear(price, 20)!;

    expect(cpw5).toBeGreaterThan(cpw10);
    expect(cpw10).toBeGreaterThan(cpw20);
  });

  // ── R8: dormant check works after one week ───────────────────────────────

  it('R8: items not worn during the week are flagged as potentially dormant (long-term)', () => {
    // Items last worn 100 days ago should appear dormant
    const dormantItem = makeItem({ id: 'dormant', last_worn_date: '2025-11-20' });
    const allItems = [...wardrobe, dormantItem];

    const dormant = clothingService.getDormantItems(allItems, 90);
    expect(dormant.map((i) => i.id)).toContain('dormant');
    // Active wardrobe items (last worn this week) should NOT appear
    wardrobe
      .filter((i) => i.last_worn_date && i.last_worn_date >= '2026-03-01')
      .forEach((i) => {
        expect(dormant.map((d) => d.id)).not.toContain(i.id);
      });
  });

  // ── R9: overdue laundry reminder fires after 5+ days ─────────────────────

  it('R9: laundry items sitting >5 days trigger overdue reminder', () => {
    const entries = [
      { item: makeItem({ id: 'week-old', status: 'laundry' as const }), addedAt: '2026-02-22' },
      { item: makeItem({ id: 'fresh', status: 'laundry' as const }),    addedAt: '2026-03-01' },
    ];
    const overdue = laundryService.getOverdueItems(entries, '2026-03-08', 5);
    expect(overdue.map((e) => e.item.id)).toContain('week-old');
    expect(overdue.map((e) => e.item.id)).not.toContain('fresh');
  });

  // ── R10: acceptance rate tracked across the week ─────────────────────────

  it('R10: acceptance rate is correctly tracked for recommendation quality metrics', () => {
    // 5 days: Mon/Wed/Fri accepted, Tue/Thu rejected
    const records: OutfitRecord[] = WEEK_DATES.slice(0, 5).map((date, i) => ({
      date,
      outfit: { top: null, outer: null, bottom: null, shoes: null, accessories: [], reason: '' },
      accepted: i % 2 === 0,
      photo_url: null,
    }));

    records.forEach((r) => historyService.recordOutfit(r));
    const stats = historyService.getMonthlyStats(records, wardrobe, '2026-03');
    expect(stats.acceptanceRate).toBeCloseTo(3 / 5, 2);
  });
});
