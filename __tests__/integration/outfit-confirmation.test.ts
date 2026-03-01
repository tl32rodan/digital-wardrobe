/**
 * Integration tests — Outfit confirmation → laundry cycle
 * Spec ref: §4.2 (confirm outfit), §4.3 (laundry basket), §4.4 (history recording)
 *
 * Covers the lifecycle:
 *   confirm outfit → worn_today + history recorded
 *   → end of day → laundry (or stays available per threshold)
 *   → mark clean → available again
 */
import { LaundryService } from '../../src/services/laundry.service';
import { HistoryService } from '../../src/services/history.service';
import { ClothingItem, OutfitSet } from '../../src/models/clothing';
import { makeItem, makeBottom, makeOuter, makeShoes, makeOutfitSet } from '../fixtures/clothing.fixtures';

describe('Integration: §4.2/§4.3/§4.4 — Outfit confirmation → laundry → clean cycle', () => {
  let laundryService: LaundryService;
  let historyService: HistoryService;

  beforeEach(() => {
    laundryService = new LaundryService();
    historyService = new HistoryService();
  });

  // ── confirm → history ─────────────────────────────────────────────────────

  it('confirming an outfit records it in history as accepted=true', () => {
    const outfit = makeOutfitSet();
    const record = historyService.recordOutfit({
      date: '2026-03-01',
      outfit,
      accepted: true,
      photo_url: null,
    });
    expect(record.accepted).toBe(true);
    expect(record.date).toBe('2026-03-01');
  });

  it('rejecting ("換一套") records the outfit as accepted=false', () => {
    const outfit = makeOutfitSet();
    const record = historyService.recordOutfit({
      date: '2026-03-01',
      outfit,
      accepted: false,
      photo_url: null,
    });
    expect(record.accepted).toBe(false);
  });

  // ── confirm → worn_today ──────────────────────────────────────────────────

  it('confirms outfit: all items transition to worn_today (threshold=1)', () => {
    const today = '2026-03-01';
    const top = makeItem({ id: 'top', status: 'available', wear_before_laundry: 1 });
    const bottom = makeBottom({ id: 'bot', status: 'available', wear_before_laundry: 1 });
    const shoes = makeShoes({ id: 'sho', status: 'available', wear_before_laundry: 1 });

    const wornTop = laundryService.recordWear(top, today);
    const wornBottom = laundryService.recordWear(bottom, today);
    const wornShoes = laundryService.recordWear(shoes, today);

    expect(wornTop.status).toBe('worn_today');
    expect(wornBottom.status).toBe('worn_today');
    expect(wornShoes.status).toBe('worn_today');
  });

  // ── end-of-day → laundry ──────────────────────────────────────────────────

  it('end-of-day moves all worn_today items (threshold=1) to laundry', () => {
    const today = '2026-03-01';
    const items: ClothingItem[] = [
      makeItem({ id: 'a', status: 'worn_today', wear_before_laundry: 1, wear_count: 1 }),
      makeBottom({ id: 'b', status: 'worn_today', wear_before_laundry: 1, wear_count: 1 }),
    ];
    const result = laundryService.endOfDayTransition(items, today);
    result.forEach((i) => expect(i.status).toBe('laundry'));
  });

  // ── jacket multi-wear cycle ───────────────────────────────────────────────

  it('jacket (threshold=3) goes through 3 wear days before hitting laundry', () => {
    const jacket = makeOuter({ id: 'j', status: 'available', wear_count: 0, wear_before_laundry: 3 });

    // Day 1
    let j = laundryService.recordWear(jacket, '2026-03-01');
    expect(j.status).toBe('available');
    j = laundryService.endOfDayTransition([j], '2026-03-01')[0];
    expect(j.status).toBe('available');

    // Day 2
    j = laundryService.recordWear(j, '2026-03-02');
    expect(j.status).toBe('available');
    j = laundryService.endOfDayTransition([j], '2026-03-02')[0];
    expect(j.status).toBe('available');

    // Day 3 — threshold reached
    j = laundryService.recordWear(j, '2026-03-03');
    expect(j.status).toBe('worn_today');
    j = laundryService.endOfDayTransition([j], '2026-03-03')[0];
    expect(j.status).toBe('laundry');
  });

  // ── laundry → clean ───────────────────────────────────────────────────────

  it('marking a single item clean restores it to available', () => {
    const item = makeItem({ status: 'laundry' });
    const clean = laundryService.markClean(item);
    expect(clean.status).toBe('available');
  });

  it('"全部洗好了" restores all laundry items simultaneously', () => {
    const items: ClothingItem[] = [
      makeItem({ id: 'a', status: 'laundry' }),
      makeBottom({ id: 'b', status: 'laundry' }),
      makeOuter({ id: 'c', status: 'laundry' }),
    ];
    const cleaned = laundryService.markAllClean(items);
    cleaned.forEach((i) => expect(i.status).toBe('available'));
  });

  // ── overdue reminder ──────────────────────────────────────────────────────

  it('items in laundry for more than 5 days trigger overdue warning', () => {
    const entries = [
      { item: makeItem({ id: 'old', status: 'laundry' as const }), addedAt: '2026-02-24' },
      { item: makeItem({ id: 'new', status: 'laundry' as const }), addedAt: '2026-03-01' },
    ];
    const overdue = laundryService.getOverdueItems(entries, '2026-03-01', 5);
    expect(overdue.map((e) => e.item.id)).toEqual(['old']);
  });

  // ── wear_count persists through the cycle ────────────────────────────────

  it('wear_count accumulates correctly through multiple cycles', () => {
    let item = makeItem({ status: 'available', wear_count: 0, wear_before_laundry: 1 });

    for (let i = 1; i <= 3; i++) {
      item = laundryService.recordWear(item, `2026-03-0${i}`);
      item = laundryService.endOfDayTransition([item], `2026-03-0${i}`)[0];
      item = laundryService.markClean(item);
    }

    expect(item.wear_count).toBe(3);
    expect(item.status).toBe('available');
  });
});
