/**
 * Unit tests — Clothing data model
 * Spec ref: §3 (Clothing data structure)
 */
import { ClothingItem, ClothingStatus } from '../../src/models/clothing';
import { ClothingService } from '../../src/services/clothing.service';
import { makeItem } from '../fixtures/clothing.fixtures';

describe('Spec §3 — Clothing data model', () => {
  let service: ClothingService;

  beforeEach(() => {
    service = new ClothingService();
  });

  // ── cost_per_wear ──────────────────────────────────────────────────────────

  describe('cost_per_wear calculation', () => {
    it('equals purchase_price / wear_count', () => {
      expect(service.computeCostPerWear(490, 12)).toBeCloseTo(40.83, 1);
    });

    it('returns null when purchase_price is null', () => {
      expect(service.computeCostPerWear(null, 10)).toBeNull();
    });

    it('returns null when wear_count is 0 (avoid division by zero)', () => {
      expect(service.computeCostPerWear(490, 0)).toBeNull();
    });

    it('returns purchase_price itself when worn exactly once', () => {
      expect(service.computeCostPerWear(490, 1)).toBeCloseTo(490, 1);
    });
  });

  // ── status field ──────────────────────────────────────────────────────────

  describe('status field', () => {
    const validStatuses: ClothingStatus[] = ['available', 'worn_today', 'laundry', 'archived', 'retired'];

    it.each(validStatuses)('accepts status "%s"', (status) => {
      const item = makeItem({ status });
      expect(item.status).toBe(status);
    });
  });

  // ── colors ────────────────────────────────────────────────────────────────

  describe('colors field', () => {
    it('stores multiple hex color codes', () => {
      const item = makeItem({ colors: ['#FFFFFF', '#EEEEEE'] });
      expect(item.colors).toHaveLength(2);
      expect(item.colors[0]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('allows a single dominant color', () => {
      const item = makeItem({ colors: ['#1A237E'] });
      expect(item.colors).toHaveLength(1);
    });
  });

  // ── seasons / occasions (multi-select) ───────────────────────────────────

  describe('seasons and occasions are multi-select', () => {
    it('item can belong to multiple seasons', () => {
      const item = makeItem({ seasons: ['春', '夏', '秋'] });
      expect(item.seasons).toHaveLength(3);
    });

    it('item can have multiple occasions', () => {
      const item = makeItem({ occasions: ['上班', '休閒'] });
      expect(item.occasions).toHaveLength(2);
    });
  });

  // ── wear_before_laundry ───────────────────────────────────────────────────

  describe('wear_before_laundry (spec §4.2 edge case)', () => {
    it('defaults to 1 (most items go to laundry after each wear)', () => {
      const item = makeItem();
      expect(item.wear_before_laundry).toBe(1);
    });

    it('can be set higher for items like jackets', () => {
      const jacket = makeItem({ category: 'outer', wear_before_laundry: 3 });
      expect(jacket.wear_before_laundry).toBe(3);
    });
  });

  // ── sequence_tag (similar item disambiguation) ───────────────────────────

  describe('sequence_tag (spec §5 — multiple similar items)', () => {
    it('item can have a sequence tag to distinguish similar pieces', () => {
      const item = makeItem({ name: '白色 T-shirt', sequence_tag: '白T #001' });
      expect(item.sequence_tag).toBe('白T #001');
    });

    it('sequence_tag is null for unique items', () => {
      const item = makeItem({ sequence_tag: null });
      expect(item.sequence_tag).toBeNull();
    });
  });

  // ── optional fields ──────────────────────────────────────────────────────

  describe('optional fields', () => {
    it('photo_url may be null (registered without photo)', () => {
      const item = makeItem({ photo_url: null });
      expect(item.photo_url).toBeNull();
    });

    it('brand may be null', () => {
      expect(makeItem({ brand: null }).brand).toBeNull();
    });

    it('purchase_price may be null', () => {
      expect(makeItem({ purchase_price: null }).purchase_price).toBeNull();
    });

    it('notes may be null', () => {
      expect(makeItem({ notes: null }).notes).toBeNull();
    });
  });

  // ── addItem ───────────────────────────────────────────────────────────────

  describe('addItem()', () => {
    const strippedItem = () => {
      // Remove id/wear_count/cost_per_wear — those are managed by the service
      const { id: _id, wear_count: _wc, cost_per_wear: _cpw, ...rest } = makeItem();
      return rest;
    };

    it('assigns a unique id', () => {
      const a = service.addItem(strippedItem());
      const b = service.addItem(strippedItem());
      expect(a.id).not.toBe(b.id);
    });

    it('starts with wear_count = 0', () => {
      const item = service.addItem(strippedItem());
      expect(item.wear_count).toBe(0);
    });

    it('sets cost_per_wear to null on initial add (wear_count = 0)', () => {
      const item = service.addItem(strippedItem());
      expect(item.cost_per_wear).toBeNull();
    });

    it('status defaults to "available" on add', () => {
      const item = service.addItem(strippedItem());
      expect(item.status).toBe('available');
    });
  });

  // ── sequence tag auto-assignment ─────────────────────────────────────────

  describe('assignSequenceTags() (spec §5)', () => {
    it('tags similar-looking items within the same category', () => {
      const items: ClothingItem[] = [
        makeItem({ id: 'w1', name: '白T', category: 'top', colors: ['#FFFFFF'] }),
        makeItem({ id: 'w2', name: '白T', category: 'top', colors: ['#FAFAFA'] }),
        makeItem({ id: 'w3', name: '白T', category: 'top', colors: ['#F5F5F5'] }),
      ];
      const tagged = service.assignSequenceTags(items);
      const tags = tagged.map((i) => i.sequence_tag);
      expect(tags).toContain('白T #001');
      expect(tags).toContain('白T #002');
      expect(tags).toContain('白T #003');
    });

    it('does not tag items that are already unique in their category', () => {
      const items: ClothingItem[] = [
        makeItem({ id: 'x1', name: '黑色西裝外套', category: 'outer', colors: ['#000000'] }),
      ];
      const tagged = service.assignSequenceTags(items);
      expect(tagged[0].sequence_tag).toBeNull();
    });
  });
});
