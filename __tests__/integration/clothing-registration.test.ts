/**
 * Integration tests — Clothing registration pipeline
 * Spec ref: §4.1 (Onboarding & 新增)
 *
 * Covers the end-to-end flow:
 *   Photo capture → AI recognition → Draft → User confirms → Item saved
 *   Also covers batch/quick-scan mode
 */
import { ClothingService } from '../../src/services/clothing.service';
import { AIService, AIProvider } from '../../src/services/ai.service';
import { AIRecognitionResult } from '../../src/services/clothing.service';

const makeMockAIProvider = (result: Partial<AIRecognitionResult> = {}): AIProvider => ({
  recognizeClothing: jest.fn().mockResolvedValue({
    category: 'top',
    colors: ['#FFFFFF'],
    suggested_name: 'AI生成名稱',
    seasons: ['春', '夏'],
    occasions: ['休閒'],
    sequence_tag: null,
    ...result,
  }),
  generateOutfit: jest.fn(),
});

describe('Integration: §4.1 — Clothing registration pipeline', () => {
  let clothingService: ClothingService;
  let aiService: AIService;

  beforeEach(() => {
    clothingService = new ClothingService();
    aiService = new AIService(makeMockAIProvider());
  });

  // ── single item flow ──────────────────────────────────────────────────────

  it('single photo registration: AI fills in details, user confirms', async () => {
    // Step 1: AI recognizes
    const aiResult = await aiService.recognizeClothing('base64photo');

    // Step 2: Save draft
    const draft = clothingService.saveDraft('gs://bucket/photo.jpg');
    expect(draft.status).toBe('draft');

    // Step 3: Confirm with AI result
    const item = clothingService.confirmDraft(draft, {
      name: aiResult.suggested_name,
      category: aiResult.category,
      colors: aiResult.colors,
      seasons: aiResult.seasons,
      occasions: aiResult.occasions,
    });

    expect(item.status).toBe('available');
    expect(item.name).toBe('AI生成名稱');
    expect(item.category).toBe('top');
    expect(item.colors).toContain('#FFFFFF');
  });

  it('user can override AI-suggested name', async () => {
    const aiResult = await aiService.recognizeClothing('base64photo');
    const draft = clothingService.saveDraft('gs://bucket/photo.jpg');
    const item = clothingService.confirmDraft(draft, {
      name: '我自己取的名字',  // user override
      category: aiResult.category,
      colors: aiResult.colors,
    });
    expect(item.name).toBe('我自己取的名字');
  });

  // ── batch / quick-scan mode ───────────────────────────────────────────────

  it('batch mode: save 20 drafts immediately without waiting for AI', () => {
    // Spec §4.1 edge case: initial onboarding can have 20-50 items
    const drafts = Array.from({ length: 20 }, (_, i) =>
      clothingService.saveDraft(`gs://bucket/item${i}.jpg`),
    );
    expect(drafts).toHaveLength(20);
    drafts.forEach((d) => expect(d.status).toBe('draft'));
  });

  it('batch mode: drafts can be confirmed one by one later', async () => {
    const drafts = [
      clothingService.saveDraft('gs://bucket/a.jpg'),
      clothingService.saveDraft('gs://bucket/b.jpg'),
    ];

    const confirmed = await Promise.all(
      drafts.map(async (draft) => {
        const aiResult = await aiService.recognizeClothing('base64photo');
        return clothingService.confirmDraft(draft, {
          name: aiResult.suggested_name,
          category: aiResult.category,
        });
      }),
    );

    confirmed.forEach((item) => {
      expect(item.status).toBe('available');
      expect(item.id).toBeTruthy();
    });
  });

  it('batch mode: each confirmed item gets a unique id', async () => {
    const drafts = Array.from({ length: 5 }, (_, i) =>
      clothingService.saveDraft(`gs://bucket/p${i}.jpg`),
    );
    const items = drafts.map((d) =>
      clothingService.confirmDraft(d, { category: 'top' }),
    );
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(5);
  });

  // ── optional fields ───────────────────────────────────────────────────────

  it('item can be confirmed with only required fields (price/brand optional)', () => {
    const draft = clothingService.saveDraft('gs://bucket/x.jpg');
    const item = clothingService.confirmDraft(draft, {
      category: 'top',
      // brand, purchase_price, seasons, occasions all omitted
    });
    expect(item.status).toBe('available');
    expect(item.purchase_price).toBeNull();
    expect(item.brand).toBeNull();
  });

  // ── sequence tag auto-assignment ──────────────────────────────────────────

  it('similar items get sequence tags after batch import', () => {
    // Spec §5 — 5 similar white T-shirts need disambiguation
    const items = Array.from({ length: 5 }, (_, i) =>
      clothingService.confirmDraft(clothingService.saveDraft(`gs://bucket/wt${i}.jpg`), {
        name: '白色T-shirt',
        category: 'top',
        colors: ['#FFFFFF'],
      }),
    );

    const tagged = clothingService.assignSequenceTags(items);
    const tags = tagged.map((i) => i.sequence_tag).filter(Boolean);
    expect(new Set(tags).size).toBe(5); // all unique tags
    expect(tags[0]).toMatch(/白色T-shirt #\d+/);
  });

  // ── cost_per_wear updates after wear ──────────────────────────────────────

  it('cost_per_wear is recalculated correctly after adding purchase price', () => {
    const item = clothingService.addItem({
      name: 'Test shirt',
      category: 'top',
      colors: ['#FFF'],
      seasons: ['春'],
      occasions: ['休閒'],
      photo_url: null,
      brand: null,
      purchase_price: 490,
      purchase_date: '2026-01-01',
      last_worn_date: null,
      notes: null,
      wear_before_laundry: 1,
      sequence_tag: null,
      status: 'available',
    });

    // Initially cost_per_wear is null (wear_count = 0)
    expect(item.cost_per_wear).toBeNull();

    // After wear_count is updated externally to 10
    const cpw = clothingService.computeCostPerWear(490, 10);
    expect(cpw).toBeCloseTo(49, 1);
  });
});
