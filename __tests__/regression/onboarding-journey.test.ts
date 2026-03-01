/**
 * Regression tests — Onboarding user journey
 * Spec ref: §4.1, §4.6, §5 (edge cases)
 *
 * Simulates a new user registering a full wardrobe (30+ items)
 * using batch quick-scan mode, then confirming all drafts.
 *
 * This test MUST pass after every refactor to ensure the
 * first-run experience is never broken.
 */
import { ClothingService } from '../../src/services/clothing.service';
import { ClothingItem } from '../../src/models/clothing';

// Representative wardrobe of 30 items a new user might have
const WARDROBE_FIXTURES: Array<Partial<ClothingItem> & { photoUrl: string }> = [
  // Tops
  { photoUrl: 'p01.jpg', name: '白T #001', category: 'top', colors: ['#FFFFFF'], seasons: ['春', '夏'], occasions: ['休閒'] },
  { photoUrl: 'p02.jpg', name: '白T #002', category: 'top', colors: ['#FAFAFA'], seasons: ['春', '夏'], occasions: ['休閒'] },
  { photoUrl: 'p03.jpg', name: '白T #003', category: 'top', colors: ['#F5F5F5'], seasons: ['春', '夏'], occasions: ['休閒'] },
  { photoUrl: 'p04.jpg', name: '黑色T-shirt', category: 'top', colors: ['#212121'], seasons: ['春', '夏', '秋'], occasions: ['休閒', '上班'] },
  { photoUrl: 'p05.jpg', name: '灰色POLO衫', category: 'top', colors: ['#9E9E9E'], seasons: ['春', '夏'], occasions: ['上班'] },
  { photoUrl: 'p06.jpg', name: '深藍格紋襯衫', category: 'top', colors: ['#1A237E', '#FFFFFF'], seasons: ['秋', '冬'], occasions: ['上班', '正式'] },
  { photoUrl: 'p07.jpg', name: '淺藍牛津襯衫', category: 'top', colors: ['#90CAF9'], seasons: ['春', '秋'], occasions: ['上班'] },
  // Bottoms
  { photoUrl: 'p08.jpg', name: '深藍牛仔褲', category: 'bottom', colors: ['#1A237E'], seasons: ['春', '秋', '冬'], occasions: ['休閒'] },
  { photoUrl: 'p09.jpg', name: '黑色卡其褲', category: 'bottom', colors: ['#212121'], seasons: ['春', '夏', '秋'], occasions: ['上班', '休閒'] },
  { photoUrl: 'p10.jpg', name: '米色卡其褲', category: 'bottom', colors: ['#F5F5DC'], seasons: ['春', '夏'], occasions: ['休閒'] },
  { photoUrl: 'p11.jpg', name: '深灰西裝褲', category: 'bottom', colors: ['#616161'], seasons: ['秋', '冬'], occasions: ['上班', '正式'] },
  // Outers
  { photoUrl: 'p12.jpg', name: '灰色薄外套', category: 'outer', colors: ['#9E9E9E'], seasons: ['春', '秋'], occasions: ['休閒'], wear_before_laundry: 3 },
  { photoUrl: 'p13.jpg', name: '深藍運動外套', category: 'outer', colors: ['#1A237E'], seasons: ['春', '秋'], occasions: ['休閒'], wear_before_laundry: 3 },
  { photoUrl: 'p14.jpg', name: '黑色西裝外套', category: 'outer', colors: ['#212121'], seasons: ['秋', '冬'], occasions: ['上班', '正式'], wear_before_laundry: 5 },
  { photoUrl: 'p15.jpg', name: '羽絨背心', category: 'outer', colors: ['#757575'], seasons: ['冬'], occasions: ['休閒', '上班'], wear_before_laundry: 10 },
  // Shoes
  { photoUrl: 'p16.jpg', name: '白色休閒鞋', category: 'shoes', colors: ['#FAFAFA'], seasons: ['春', '夏', '秋'], occasions: ['休閒'] },
  { photoUrl: 'p17.jpg', name: '黑色運動鞋', category: 'shoes', colors: ['#212121'], seasons: ['春', '夏', '秋'], occasions: ['休閒', '上班'] },
  { photoUrl: 'p18.jpg', name: '棕色皮鞋', category: 'shoes', colors: ['#795548'], seasons: ['秋', '冬'], occasions: ['上班', '正式'] },
  { photoUrl: 'p19.jpg', name: '深藍帆船鞋', category: 'shoes', colors: ['#1A237E'], seasons: ['春', '夏'], occasions: ['休閒'] },
  // More tops
  { photoUrl: 'p20.jpg', name: '橄欖色Henley', category: 'top', colors: ['#558B2F'], seasons: ['秋'], occasions: ['休閒'] },
  { photoUrl: 'p21.jpg', name: '藏青色毛衣', category: 'top', colors: ['#1A237E'], seasons: ['冬'], occasions: ['上班', '休閒'] },
  { photoUrl: 'p22.jpg', name: '黑色毛衣', category: 'top', colors: ['#212121'], seasons: ['冬'], occasions: ['上班', '休閒'] },
  // Accessories
  { photoUrl: 'p23.jpg', name: '黑色皮帶', category: 'accessory', colors: ['#212121'], seasons: ['春', '夏', '秋', '冬'], occasions: ['上班'] },
  { photoUrl: 'p24.jpg', name: '深藍針織帽', category: 'accessory', colors: ['#1A237E'], seasons: ['冬'], occasions: ['休閒'] },
  { photoUrl: 'p25.jpg', name: '格紋圍巾', category: 'accessory', colors: ['#B71C1C', '#FFFFFF'], seasons: ['冬'], occasions: ['休閒'] },
  // More misc
  { photoUrl: 'p26.jpg', name: '黑色短褲', category: 'bottom', colors: ['#212121'], seasons: ['夏'], occasions: ['休閒', '居家'] },
  { photoUrl: 'p27.jpg', name: '灰色居家T', category: 'top', colors: ['#9E9E9E'], seasons: ['春', '夏', '秋', '冬'], occasions: ['居家'] },
  { photoUrl: 'p28.jpg', name: '深藍居家褲', category: 'bottom', colors: ['#1A237E'], seasons: ['春', '夏', '秋', '冬'], occasions: ['居家'] },
  { photoUrl: 'p29.jpg', name: '白色斜紋布褲', category: 'bottom', colors: ['#FAFAFA'], seasons: ['春', '夏'], occasions: ['休閒', '上班'] },
  { photoUrl: 'p30.jpg', name: '深灰針織毛衣', category: 'top', colors: ['#424242'], seasons: ['冬'], occasions: ['上班', '休閒'] },
];

describe('Regression: §4.1 — New user onboarding (30-item wardrobe)', () => {
  let service: ClothingService;

  beforeEach(() => {
    service = new ClothingService();
  });

  // ── R1: batch quick-scan ──────────────────────────────────────────────────

  it('R1: user can scan all 30 items without blocking on AI', () => {
    const drafts = WARDROBE_FIXTURES.map((f) => service.saveDraft(f.photoUrl));
    expect(drafts).toHaveLength(30);
    drafts.forEach((d) => expect(d.status).toBe('draft'));
  });

  // ── R2: confirm all drafts ────────────────────────────────────────────────

  it('R2: all 30 drafts can be confirmed and become available items', () => {
    const items = WARDROBE_FIXTURES.map((f) => {
      const { photoUrl, ...attrs } = f;
      const draft = service.saveDraft(photoUrl);
      return service.confirmDraft(draft, attrs as Partial<ClothingItem>);
    });
    expect(items).toHaveLength(30);
    items.forEach((item) => expect(item.status).toBe('available'));
  });

  // ── R3: no duplicate ids ──────────────────────────────────────────────────

  it('R3: all 30 items receive unique IDs', () => {
    const items = WARDROBE_FIXTURES.map((f) => {
      const { photoUrl, ...attrs } = f;
      return service.confirmDraft(service.saveDraft(photoUrl), attrs as Partial<ClothingItem>);
    });
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(30);
  });

  // ── R4: similar item disambiguation ──────────────────────────────────────

  it('R4: three similar white T-shirts each get unique sequence tags', () => {
    const whiteTItems = WARDROBE_FIXTURES.filter((f) =>
      f.name?.startsWith('白T'),
    ).map((f) => {
      const { photoUrl, ...attrs } = f;
      return service.confirmDraft(service.saveDraft(photoUrl), attrs as Partial<ClothingItem>);
    });

    const tagged = service.assignSequenceTags(whiteTItems);
    const tags = tagged.map((i) => i.sequence_tag);
    expect(new Set(tags).size).toBe(3);
    tags.forEach((t) => expect(t).toBeTruthy());
  });

  // ── R5: items with high wear_before_laundry default correctly ────────────

  it('R5: outer items with wear_before_laundry > 1 preserve their threshold', () => {
    const outerItems = WARDROBE_FIXTURES.filter((f) => f.category === 'outer');
    const confirmed = outerItems.map((f) => {
      const { photoUrl, ...attrs } = f;
      return service.confirmDraft(service.saveDraft(photoUrl), attrs as Partial<ClothingItem>);
    });
    const jacket = confirmed.find((i) => i.name === '黑色西裝外套');
    expect(jacket?.wear_before_laundry).toBe(5);
  });

  // ── R6: optional fields remain null when not provided ────────────────────

  it('R6: items without brand or purchase_price have null for those fields', () => {
    const draft = service.saveDraft('gs://bucket/item.jpg');
    const item = service.confirmDraft(draft, { category: 'top', name: '無品牌T-shirt' });
    expect(item.brand).toBeNull();
    expect(item.purchase_price).toBeNull();
    expect(item.cost_per_wear).toBeNull();
  });

  // ── R7: retired items are not deleted ─────────────────────────────────────

  it('R7: retiring an item preserves its history and keeps it in the system', () => {
    const item = service.confirmDraft(service.saveDraft('p.jpg'), {
      name: '舊T-shirt',
      category: 'top',
    });
    // Simulate worn 20 times
    const worn = { ...item, wear_count: 20, last_worn_date: '2025-12-31' };
    const retired = service.retireItem(worn);
    expect(retired.status).toBe('retired');
    expect(retired.id).toBe(item.id);
    expect(retired.wear_count).toBe(20);
  });
});
