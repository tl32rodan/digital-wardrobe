// Stub — implementation intentionally absent (TDD red phase)
import { ClothingItem, OutfitSet, UserPreferences, WeatherCondition, Occasion } from '../models/clothing';

export interface RecommendationContext {
  weather: WeatherCondition;
  occasion: Occasion;
  recentHistory: OutfitSet[];   // last 7 days
  preferences: UserPreferences;
  today: string;                // ISO 8601
}

export interface CachedRecommendation {
  date: string;
  outfits: OutfitSet[];
  generatedAt: string;
}

export class OutfitService {
  /**
   * Spec §4.2 — generate 1–3 outfit options
   * Considers: weather, occasion, last 7 days, preferences
   */
  recommend(
    _wardrobe: ClothingItem[],
    _context: RecommendationContext,
  ): OutfitSet[] {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.2 — filter out items worn within min_repeat_interval for their occasion
   * Spec §5 — formal ≥14d, casual ≥7d, home = 0d
   */
  filterByRepeatInterval(
    _items: ClothingItem[],
    _history: OutfitSet[],
    _preferences: UserPreferences,
    _today: string,
    _occasion: Occasion,
  ): ClothingItem[] {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.2 / §5 — consider indoor/outdoor temp difference for layering advice
   */
  suggestLayering(_weather: WeatherCondition, _availableOuters: ClothingItem[]): ClothingItem | null {
    throw new Error('Not implemented');
  }

  /**
   * Spec §5 (offline mode) — return cached recommendation from previous day
   */
  getCachedRecommendation(_date: string): CachedRecommendation | null {
    throw new Error('Not implemented');
  }

  /** Persist today's recommendation for offline fallback */
  cacheRecommendation(_outfits: OutfitSet[], _date: string): void {
    throw new Error('Not implemented');
  }
}
