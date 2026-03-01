/**
 * Unit tests — Outfit history & statistics
 * Spec ref: §4.4 (穿搭歷史紀錄), §4.5 (衣物健康管理)
 */
import { HistoryService } from '../../src/services/history.service';
import { OutfitRecord } from '../../src/models/clothing';
import { makeItem, makeOutfitSet } from '../fixtures/clothing.fixtures';

const makeRecord = (date: string, accepted = true): OutfitRecord => ({
  date,
  outfit: makeOutfitSet(),
  accepted,
  photo_url: null,
});

describe('Spec §4.4 — Outfit history', () => {
  let service: HistoryService;

  beforeEach(() => {
    service = new HistoryService();
  });

  // ── calendar view ─────────────────────────────────────────────────────────

  describe('getCalendarView()', () => {
    it('returns a map keyed by ISO date string', () => {
      const records = [
        makeRecord('2026-03-01'),
        makeRecord('2026-03-05'),
      ];
      const view = service.getCalendarView(records, 2026, 3);
      expect(view.has('2026-03-01')).toBe(true);
      expect(view.has('2026-03-05')).toBe(true);
    });

    it('only includes records from the requested month', () => {
      const records = [
        makeRecord('2026-02-28'),
        makeRecord('2026-03-01'),
      ];
      const view = service.getCalendarView(records, 2026, 3);
      expect(view.has('2026-02-28')).toBe(false);
      expect(view.has('2026-03-01')).toBe(true);
    });

    it('returns empty map for a month with no records', () => {
      const view = service.getCalendarView([], 2026, 3);
      expect(view.size).toBe(0);
    });
  });

  // ── monthly stats ─────────────────────────────────────────────────────────

  describe('getMonthlyStats()', () => {
    it('counts total outfits in the month', () => {
      const records = [
        makeRecord('2026-03-01'),
        makeRecord('2026-03-02'),
        makeRecord('2026-03-03'),
      ];
      const stats = service.getMonthlyStats(records, [], '2026-03');
      expect(stats.totalOutfits).toBe(3);
    });

    it('computes acceptance rate (accepted / total)', () => {
      const records = [
        makeRecord('2026-03-01', true),
        makeRecord('2026-03-02', true),
        makeRecord('2026-03-03', false),
      ];
      const stats = service.getMonthlyStats(records, [], '2026-03');
      expect(stats.acceptanceRate).toBeCloseTo(2 / 3, 2);
    });

    it('counts unique items worn in the month', () => {
      const topA = makeItem({ id: 'tA' });
      const topB = makeItem({ id: 'tB' });
      const records: OutfitRecord[] = [
        { date: '2026-03-01', outfit: makeOutfitSet({ top: topA }), accepted: true, photo_url: null },
        { date: '2026-03-02', outfit: makeOutfitSet({ top: topA }), accepted: true, photo_url: null },
        { date: '2026-03-03', outfit: makeOutfitSet({ top: topB }), accepted: true, photo_url: null },
      ];
      const stats = service.getMonthlyStats(records, [topA, topB], '2026-03');
      expect(stats.uniqueItemsWorn).toBe(2);
    });
  });

  // ── accept/reject tracking ────────────────────────────────────────────────

  describe('recordOutfit() — accept/reject tracking (spec §4.4 edge case)', () => {
    it('persists accepted=true', () => {
      const record = makeRecord('2026-03-01', true);
      const saved = service.recordOutfit(record);
      expect(saved.accepted).toBe(true);
    });

    it('persists accepted=false (rejected outfits should be learned)', () => {
      const record = makeRecord('2026-03-01', false);
      const saved = service.recordOutfit(record);
      expect(saved.accepted).toBe(false);
    });
  });

  // ── recent history ────────────────────────────────────────────────────────

  describe('getRecentHistory()', () => {
    // getRecentHistory uses new Date() internally; freeze time for deterministic results
    beforeAll(() => jest.useFakeTimers({ now: new Date('2026-03-01') }));
    afterAll(() => jest.useRealTimers());

    it('returns records from the last N days (inclusive)', () => {
      const records = [
        makeRecord('2026-02-23'), // exactly 7 days ago
        makeRecord('2026-02-25'), // 4 days ago
        makeRecord('2026-03-01'), // today
      ];
      const recent = service.getRecentHistory(records, 7);
      expect(recent).toHaveLength(3);
    });

    it('excludes records older than N days', () => {
      const records = [
        makeRecord('2026-02-01'), // 28 days ago
        makeRecord('2026-02-28'), // 1 day ago
      ];
      const recent = service.getRecentHistory(records, 7);
      const dates = recent.map((r) => r.date);
      expect(dates).not.toContain('2026-02-01');
      expect(dates).toContain('2026-02-28');
    });
  });
  // Note: getDormantItems is consolidated in ClothingService (not here)
});
