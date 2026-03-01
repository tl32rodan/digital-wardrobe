// Stub — implementation intentionally absent (TDD red phase)
import { ClothingItem, OutfitRecord } from '../models/clothing';

export interface WardrobeStats {
  mostWorn: ClothingItem[];          // top N by wear_count
  leastWorn: ClothingItem[];         // bottom N by wear_count (non-retired, non-archived)
  lowestCostPerWear: ClothingItem[]; // most cost-efficient
}

export interface MonthlyStats {
  month: string;  // "YYYY-MM"
  totalOutfits: number;
  uniqueItemsWorn: number;
  acceptanceRate: number; // accepted / total recommendations
  itemStats: { item: ClothingItem; wearCount: number }[];
}

export class HistoryService {
  /**
   * Spec §4.4 — retrieve records for calendar view
   * returns map of ISO date → OutfitRecord
   */
  getCalendarView(_records: OutfitRecord[], _year: number, _month: number): Map<string, OutfitRecord> {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.4 / §4.5 — weekly/monthly stats
   */
  getMonthlyStats(_records: OutfitRecord[], _items: ClothingItem[], _month: string): MonthlyStats {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.4 — track which outfits were accepted/rejected for AI learning
   */
  recordOutfit(_record: OutfitRecord): OutfitRecord {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.4 — get the last N days of worn outfit sets (for repeat-interval checks).
   * Uses new Date() internally for the current date reference.
   */
  getRecentHistory(_records: OutfitRecord[], _days: number): OutfitRecord[] {
    throw new Error('Not implemented');
  }
}
