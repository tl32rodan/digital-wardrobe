// Stub — implementation intentionally absent (TDD red phase)
import { ClothingItem, OutfitSet, UserPreferences, WeatherCondition, Occasion } from '../models/clothing';
import { AIRecognitionResult } from './clothing.service';

/** Spec §2 — unified AI interface; backend can be Claude or Gemini */
export interface AIProvider {
  recognizeClothing(photoBase64: string): Promise<AIRecognitionResult>;
  generateOutfit(
    wardrobe: ClothingItem[],
    weather: WeatherCondition,
    occasion: Occasion,
    preferences: UserPreferences,
    recentHistory: OutfitSet[],
    learnedFeedback: OutfitFeedback[],
  ): Promise<OutfitSet[]>;
}

export interface OutfitFeedback {
  outfitSet: OutfitSet;
  accepted: boolean;
  date: string;
}

/** Spec §4.4 — store accept/reject for AI learning */
export interface FeedbackStore {
  recordFeedback(feedback: OutfitFeedback): void;
  getFeedback(): OutfitFeedback[];
}

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  /**
   * Spec §4.1 — photo → category, colors, name suggestion
   */
  recognizeClothing(_photoBase64: string): Promise<AIRecognitionResult> {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.2 — conditions → outfit suggestions
   */
  generateOutfit(
    _wardrobe: ClothingItem[],
    _weather: WeatherCondition,
    _occasion: Occasion,
    _preferences: UserPreferences,
    _history: OutfitSet[],
    _feedback: OutfitFeedback[],
  ): Promise<OutfitSet[]> {
    throw new Error('Not implemented');
  }
}
