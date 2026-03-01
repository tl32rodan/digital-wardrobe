/**
 * Unit tests — AI service (abstracted provider interface)
 * Spec ref: §2 (AI layer), §4.1 (visual recognition), §4.2 (outfit generation), §4.4 (feedback learning)
 */
import { AIService, AIProvider, OutfitFeedback } from '../../src/services/ai.service';
import { ClothingItem, OutfitSet, UserPreferences, WeatherCondition } from '../../src/models/clothing';
import { AIRecognitionResult } from '../../src/services/clothing.service';
import {
  makeItem,
  makeBottom,
  makeOuter,
  makeShoes,
  makeOutfitSet,
  makePreferences,
} from '../fixtures/clothing.fixtures';

const makeMockProvider = (overrides: Partial<AIProvider> = {}): AIProvider => ({
  recognizeClothing: jest.fn().mockResolvedValue({
    category: 'top',
    colors: ['#FFFFFF'],
    suggested_name: 'White T-shirt',
    seasons: ['春', '夏'],
    occasions: ['休閒'],
    sequence_tag: null,
  } as AIRecognitionResult),
  generateOutfit: jest.fn().mockResolvedValue([makeOutfitSet()]),
  ...overrides,
});

describe('Spec §2 / §4.1 — AI service', () => {
  // ── provider abstraction ──────────────────────────────────────────────────

  describe('provider interface (spec §2)', () => {
    it('accepts any provider implementing AIProvider', () => {
      const provider = makeMockProvider();
      expect(() => new AIService(provider)).not.toThrow();
    });

    it('delegates recognizeClothing to the provider', async () => {
      const provider = makeMockProvider();
      const svc = new AIService(provider);
      await svc.recognizeClothing('base64photo');
      expect(provider.recognizeClothing).toHaveBeenCalledWith('base64photo');
    });

    it('delegates generateOutfit to the provider', async () => {
      const provider = makeMockProvider();
      const svc = new AIService(provider);
      const wardrobe: ClothingItem[] = [makeItem(), makeBottom(), makeShoes()];
      const weather: WeatherCondition = { temperature: 20, feels_like: 19, humidity: 55, description: '晴', indoor_temp_estimate: null };
      const prefs = makePreferences();
      await svc.generateOutfit(wardrobe, weather, '休閒', prefs, [], []);
      expect(provider.generateOutfit).toHaveBeenCalled();
    });
  });

  // ── visual recognition ────────────────────────────────────────────────────

  describe('recognizeClothing() (spec §4.1)', () => {
    it('returns a category', async () => {
      const svc = new AIService(makeMockProvider());
      const result = await svc.recognizeClothing('base64photo');
      expect(result.category).toBeDefined();
    });

    it('returns hex color array', async () => {
      const svc = new AIService(makeMockProvider());
      const result = await svc.recognizeClothing('base64photo');
      expect(Array.isArray(result.colors)).toBe(true);
      result.colors.forEach((c) => expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/));
    });

    it('returns a suggested name', async () => {
      const svc = new AIService(makeMockProvider());
      const result = await svc.recognizeClothing('base64photo');
      expect(typeof result.suggested_name).toBe('string');
      expect(result.suggested_name.length).toBeGreaterThan(0);
    });
  });

  // ── outfit generation ─────────────────────────────────────────────────────

  describe('generateOutfit() (spec §4.2)', () => {
    it('returns 1–3 outfit sets', async () => {
      const provider = makeMockProvider({
        generateOutfit: jest.fn().mockResolvedValue([makeOutfitSet(), makeOutfitSet()]),
      });
      const svc = new AIService(provider);
      const outfits = await svc.generateOutfit(
        [makeItem(), makeBottom(), makeShoes()],
        { temperature: 20, feels_like: 19, humidity: 55, description: '晴', indoor_temp_estimate: null },
        '休閒',
        makePreferences(),
        [],
        [],
      );
      expect(outfits.length).toBeGreaterThanOrEqual(1);
      expect(outfits.length).toBeLessThanOrEqual(3);
    });

    it('passes feedback history to provider for learning (spec §4.4)', async () => {
      const provider = makeMockProvider();
      const svc = new AIService(provider);
      const feedback: OutfitFeedback[] = [
        { outfitSet: makeOutfitSet(), accepted: true, date: '2026-02-28' },
        { outfitSet: makeOutfitSet(), accepted: false, date: '2026-02-27' },
      ];
      await svc.generateOutfit(
        [makeItem(), makeBottom(), makeShoes()],
        { temperature: 20, feels_like: 19, humidity: 55, description: '晴', indoor_temp_estimate: null },
        '休閒',
        makePreferences(),
        [],
        feedback,
      );
      const call = (provider.generateOutfit as jest.Mock).mock.calls[0];
      // The 6th argument should be the feedback array
      expect(call[5]).toHaveLength(2);
    });
  });
});
