/**
 * Unit tests — Laundry basket state machine
 * Spec ref: §4.3 (洗衣籃管理)
 */
import { LaundryService, LaundryEntry } from '../../src/services/laundry.service';
import { makeItem, makeOuter } from '../fixtures/clothing.fixtures';

describe('Spec §4.3 — Laundry basket management', () => {
  let service: LaundryService;

  beforeEach(() => {
    service = new LaundryService();
  });

  // ── state machine transitions ─────────────────────────────────────────────

  describe('state machine: available → worn_today → laundry → available', () => {
    it('recordWear(): available item becomes worn_today after one wear (threshold=1)', () => {
      const item = makeItem({ status: 'available', wear_count: 0, wear_before_laundry: 1 });
      const updated = service.recordWear(item, '2026-03-01');
      expect(updated.status).toBe('worn_today');
      expect(updated.wear_count).toBe(1);
    });

    it('recordWear(): increments wear_count', () => {
      const item = makeItem({ status: 'available', wear_count: 5, wear_before_laundry: 1 });
      const updated = service.recordWear(item, '2026-03-01');
      expect(updated.wear_count).toBe(6);
    });

    it('recordWear(): sets last_worn_date to today', () => {
      const item = makeItem({ status: 'available' });
      const updated = service.recordWear(item, '2026-03-01');
      expect(updated.last_worn_date).toBe('2026-03-01');
    });

    it('sendToLaundry(): worn_today → laundry', () => {
      const item = makeItem({ status: 'worn_today' });
      const updated = service.sendToLaundry(item, '2026-03-01');
      expect(updated.status).toBe('laundry');
    });

    it('markClean(): laundry → available', () => {
      const item = makeItem({ status: 'laundry' });
      const cleaned = service.markClean(item);
      expect(cleaned.status).toBe('available');
    });
  });

  // ── wear_before_laundry threshold ─────────────────────────────────────────

  describe('wear_before_laundry threshold (spec §4.2 edge case)', () => {
    it('jacket with threshold=3 stays available after first wear', () => {
      const jacket = makeOuter({ status: 'available', wear_count: 0, wear_before_laundry: 3 });
      const updated = service.recordWear(jacket, '2026-03-01');
      expect(updated.status).toBe('available');
      expect(updated.wear_count).toBe(1);
    });

    it('jacket with threshold=3 stays available after second wear', () => {
      const jacket = makeOuter({ status: 'available', wear_count: 1, wear_before_laundry: 3 });
      const updated = service.recordWear(jacket, '2026-03-02');
      expect(updated.status).toBe('available');
    });

    it('jacket with threshold=3 becomes worn_today on third wear', () => {
      const jacket = makeOuter({ status: 'available', wear_count: 2, wear_before_laundry: 3 });
      const updated = service.recordWear(jacket, '2026-03-03');
      expect(updated.status).toBe('worn_today');
    });
  });

  // ── bulk operations ───────────────────────────────────────────────────────

  describe('markAllClean() — bulk restore', () => {
    it('restores all laundry items to available', () => {
      const items = [
        makeItem({ id: 'a', status: 'laundry' }),
        makeItem({ id: 'b', status: 'laundry' }),
        makeItem({ id: 'c', status: 'laundry' }),
      ];
      const cleaned = service.markAllClean(items);
      cleaned.forEach((i) => expect(i.status).toBe('available'));
    });

    it('does not touch items that are not in laundry', () => {
      const items = [
        makeItem({ id: 'a', status: 'laundry' }),
        makeItem({ id: 'b', status: 'available' }),
      ];
      const cleaned = service.markAllClean(items);
      const bItem = cleaned.find((i) => i.id === 'b');
      expect(bItem?.status).toBe('available'); // unchanged
    });
  });

  // ── overdue detection ─────────────────────────────────────────────────────

  describe('getOverdueItems() — items in laundry too long', () => {
    it('returns items in laundry longer than overdueDays', () => {
      const entries: LaundryEntry[] = [
        { item: makeItem({ id: 'old', status: 'laundry' }), addedAt: '2026-02-20' }, // 9 days ago
        { item: makeItem({ id: 'new', status: 'laundry' }), addedAt: '2026-02-28' }, // 1 day ago
      ];
      const overdue = service.getOverdueItems(entries, '2026-03-01', 5);
      expect(overdue.map((e) => e.item.id)).toContain('old');
      expect(overdue.map((e) => e.item.id)).not.toContain('new');
    });

    it('uses overdueDays default of 5 from preferences', () => {
      const entries: LaundryEntry[] = [
        { item: makeItem({ id: 'five', status: 'laundry' }), addedAt: '2026-02-24' }, // exactly 5 days
      ];
      const overdue = service.getOverdueItems(entries, '2026-03-01', 5);
      expect(overdue).toHaveLength(1);
    });
  });

  // ── end-of-day transition ─────────────────────────────────────────────────

  describe('endOfDayTransition() — worn_today → laundry', () => {
    it('moves worn_today items with threshold=1 to laundry', () => {
      const items = [
        makeItem({ id: 'a', status: 'worn_today', wear_before_laundry: 1 }),
        makeItem({ id: 'b', status: 'available' }),
      ];
      const result = service.endOfDayTransition(items, '2026-03-01');
      expect(result.find((i) => i.id === 'a')?.status).toBe('laundry');
      expect(result.find((i) => i.id === 'b')?.status).toBe('available');
    });

    it('moves jacket with threshold=3 to laundry only on the correct wear cycle', () => {
      // jacket worn 3 times total → worn_today → should go to laundry now
      const jacket = makeOuter({ id: 'j', status: 'worn_today', wear_count: 3, wear_before_laundry: 3 });
      const result = service.endOfDayTransition([jacket], '2026-03-01');
      expect(result[0].status).toBe('laundry');
    });

    it('keeps jacket available if wear_before_laundry threshold not yet reached', () => {
      // jacket worn 2 out of 3 times → stays available
      const jacket = makeOuter({ id: 'j', status: 'worn_today', wear_count: 2, wear_before_laundry: 3 });
      const result = service.endOfDayTransition([jacket], '2026-03-01');
      expect(result[0].status).toBe('available');
    });
  });
});
