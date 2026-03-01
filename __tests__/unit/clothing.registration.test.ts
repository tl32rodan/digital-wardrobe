/**
 * Unit tests — Clothing registration
 * Spec ref: §4.1 (Onboarding & 新增)
 */
import { ClothingService, DraftClothingItem } from '../../src/services/clothing.service';
import { makeItem } from '../fixtures/clothing.fixtures';

describe('Spec §4.1 — Clothing registration', () => {
  let service: ClothingService;

  beforeEach(() => {
    service = new ClothingService();
  });

  // ── draft / batch mode ────────────────────────────────────────────────────

  describe('saveDraft() — quick-scan / batch mode', () => {
    it('saves a photo URL immediately without waiting for AI', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      expect(draft.photo_url).toBe('gs://bucket/photo.jpg');
    });

    it('sets status to "draft" (not yet in recommendation pool)', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      expect(draft.status).toBe('draft');
    });

    it('does not require any other field to be filled', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      // name, category, etc. can be undefined/null in draft
      expect(draft.name).toBeFalsy();
    });

    it('can create multiple drafts in sequence (batch mode)', () => {
      const drafts: DraftClothingItem[] = [];
      for (let i = 0; i < 5; i++) {
        drafts.push(service.saveDraft(`gs://bucket/photo${i}.jpg`));
      }
      expect(drafts).toHaveLength(5);
      const urls = new Set(drafts.map((d) => d.photo_url));
      expect(urls.size).toBe(5);
    });
  });

  // ── confirm draft ─────────────────────────────────────────────────────────

  describe('confirmDraft() — promote draft to saved item', () => {
    it('produces a ClothingItem with status "available"', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      const item = service.confirmDraft(draft, {
        name: '白色 T-shirt',
        category: 'top',
        colors: ['#FFFFFF'],
        seasons: ['春', '夏'],
        occasions: ['休閒'],
        brand: 'UNIQLO',
        purchase_price: 490,
      });
      expect(item.status).toBe('available');
    });

    it('merges AI suggestions with user overrides (user takes precedence)', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      const item = service.confirmDraft(draft, { name: 'My Custom Name', category: 'top' });
      expect(item.name).toBe('My Custom Name');
    });

    it('assigns a unique id to the confirmed item', () => {
      const draft = service.saveDraft('gs://bucket/photo.jpg');
      const item = service.confirmDraft(draft, { category: 'top' });
      expect(item.id).toBeTruthy();
    });
  });

  // ── retire & archive ──────────────────────────────────────────────────────

  describe('retireItem() (spec §4.5)', () => {
    it('sets status to "retired"', () => {
      const item = makeItem({ status: 'available' });
      const retired = service.retireItem(item);
      expect(retired.status).toBe('retired');
    });

    it('preserves all history fields (wear_count, last_worn_date)', () => {
      const item = makeItem({ wear_count: 25, last_worn_date: '2025-12-01' });
      const retired = service.retireItem(item);
      expect(retired.wear_count).toBe(25);
      expect(retired.last_worn_date).toBe('2025-12-01');
    });

    it('does NOT delete the item from the data store', () => {
      // Retirement must be non-destructive — history is preserved
      const item = makeItem();
      const retired = service.retireItem(item);
      expect(retired.id).toBe(item.id);
    });
  });

  // ── seasonal archive ──────────────────────────────────────────────────────

  describe('archiveSeason() (spec §4.5)', () => {
    it('sets status to "archived" (not retired) for seasonal items', () => {
      // archived = temporarily out of recommendation pool; still owned and wearable
      const summerTop = makeItem({ seasons: ['夏'], status: 'available' });
      const result = service.archiveSeason([summerTop], ['夏']);
      expect(result[0].status).toBe('archived');
    });

    it('archives items whose seasons are entirely within the archived set', () => {
      const summerTop = makeItem({ id: 's', seasons: ['夏'], status: 'available' });
      const allYear = makeItem({ id: 'a', seasons: ['春', '夏', '秋', '冬'], status: 'available' });
      const result = service.archiveSeason([summerTop, allYear], ['夏']);
      // summer-only item → archived; all-year item → stays available (still relevant in other seasons)
      expect(result.find((i) => i.id === 's')?.status).toBe('archived');
      expect(result.find((i) => i.id === 'a')?.status).toBe('available');
    });

    it('archived items are distinct from retired — archived can be restored', () => {
      const summerTop = makeItem({ seasons: ['夏'], status: 'available' });
      const [archived] = service.archiveSeason([summerTop], ['夏']);
      expect(archived.status).toBe('archived');
      expect(archived.status).not.toBe('retired');
    });
  });

  // ── dormant items ─────────────────────────────────────────────────────────

  describe('getDormantItems() (spec §4.5)', () => {
    // getDormantItems uses new Date() internally; freeze time to keep tests deterministic
    beforeAll(() => jest.useFakeTimers({ now: new Date('2026-03-01') }));
    afterAll(() => jest.useRealTimers());

    it('returns items not worn for ≥ thresholdDays', () => {
      const dormant = makeItem({ last_worn_date: '2025-09-01' });    // ~6 months ago
      const recent  = makeItem({ id: 'r1', last_worn_date: '2026-02-28' });
      const neverWorn = makeItem({ id: 'n1', last_worn_date: null, purchase_date: '2025-01-01' });
      const result = service.getDormantItems([dormant, recent, neverWorn], 90);
      const ids = result.map((i) => i.id);
      expect(ids).toContain(dormant.id);
      expect(ids).not.toContain(recent.id);
    });

    it('includes never-worn items if purchase date is old enough', () => {
      const neverWorn = makeItem({ last_worn_date: null, purchase_date: '2025-05-01' });
      const result = service.getDormantItems([neverWorn], 90);
      expect(result).toHaveLength(1);
    });

    it('excludes retired items from dormant check', () => {
      const retiredOld = makeItem({ status: 'retired', last_worn_date: '2024-01-01' });
      const result = service.getDormantItems([retiredOld], 90);
      expect(result).toHaveLength(0);
    });

    it('excludes archived items from dormant check', () => {
      // Archived items are intentionally stored away — not a sign of neglect
      const archivedOld = makeItem({ status: 'archived', last_worn_date: '2024-01-01' });
      const result = service.getDormantItems([archivedOld], 90);
      expect(result).toHaveLength(0);
    });
  });

  // ── CP value report ───────────────────────────────────────────────────────

  describe('getCostPerWearReport() (spec §4.5)', () => {
    it('returns items sorted by cost_per_wear ascending (most efficient first)', () => {
      const cheap = makeItem({ id: 'c', purchase_price: 100, wear_count: 50 });
      const expensive = makeItem({ id: 'e', purchase_price: 2000, wear_count: 5 });
      cheap.cost_per_wear = 2;
      expensive.cost_per_wear = 400;
      const report = service.getCostPerWearReport([expensive, cheap]);
      expect(report[0].id).toBe('c');
      expect(report[1].id).toBe('e');
    });

    it('excludes items with no purchase_price from the report', () => {
      const noPriceItem = makeItem({ purchase_price: null, cost_per_wear: null });
      const pricedItem = makeItem({ id: 'p1', purchase_price: 500, wear_count: 10 });
      pricedItem.cost_per_wear = 50;
      const report = service.getCostPerWearReport([noPriceItem, pricedItem]);
      expect(report).toHaveLength(1);
      expect(report[0].id).toBe('p1');
    });
  });
});
