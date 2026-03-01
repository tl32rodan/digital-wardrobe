// Stub — implementation intentionally absent (TDD red phase)
import { ClothingItem, Category, Season, Occasion } from '../models/clothing';

export interface DraftClothingItem
  extends Omit<ClothingItem, 'id' | 'wear_count' | 'cost_per_wear' | 'status' | 'last_worn_date'> {
  status: 'draft';
}

export interface AIRecognitionResult {
  category: Category;
  colors: string[];
  suggested_name: string;
  seasons: Season[];
  occasions: Occasion[];
  sequence_tag: string | null;
}

export class ClothingService {
  /** Spec §3 — compute cost_per_wear = purchase_price / wear_count */
  computeCostPerWear(_price: number | null, _wearCount: number): number | null {
    throw new Error('Not implemented');
  }

  /** Add a new item to the wardrobe */
  addItem(_item: Omit<ClothingItem, 'id' | 'wear_count' | 'cost_per_wear'>): ClothingItem {
    throw new Error('Not implemented');
  }

  /** Spec §4.1 — save photo without waiting for AI (batch/draft mode) */
  saveDraft(_photoUrl: string): DraftClothingItem {
    throw new Error('Not implemented');
  }

  /** Spec §4.1 — confirm AI recognition result and promote draft to saved item */
  confirmDraft(_draft: DraftClothingItem, _overrides: Partial<ClothingItem>): ClothingItem {
    throw new Error('Not implemented');
  }

  /** Spec §4.5 — mark item as retired (preserve history) */
  retireItem(_item: ClothingItem): ClothingItem {
    throw new Error('Not implemented');
  }

  /** Spec §4.5 — seasonal archive: remove items from recommendation pool */
  archiveSeason(_items: ClothingItem[], _seasons: Season[]): ClothingItem[] {
    throw new Error('Not implemented');
  }

  /** Spec §4.5 — dormant items not worn in X days */
  getDormantItems(_items: ClothingItem[], _thresholdDays: number): ClothingItem[] {
    throw new Error('Not implemented');
  }

  /** Spec §4.5 — CP value report sorted by cost_per_wear ascending */
  getCostPerWearReport(_items: ClothingItem[]): ClothingItem[] {
    throw new Error('Not implemented');
  }

  /** Spec §5 — disambiguate similar items with sequence tags */
  assignSequenceTags(_items: ClothingItem[]): ClothingItem[] {
    throw new Error('Not implemented');
  }
}
