// Stub — implementation intentionally absent (TDD red phase)
import { ClothingItem } from '../models/clothing';

export interface LaundryEntry {
  item: ClothingItem;
  addedAt: string; // ISO 8601
}

export class LaundryService {
  /**
   * Spec §4.2 — after outfit is confirmed, track wear count.
   * When wear_count % wear_before_laundry === 0, move to laundry.
   * Otherwise stays available.
   */
  recordWear(_item: ClothingItem, _today: string): ClothingItem {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.3 — move item to laundry basket (status: laundry)
   */
  sendToLaundry(_item: ClothingItem, _today: string): ClothingItem {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.3 — mark single item as clean (status: available)
   */
  markClean(_item: ClothingItem): ClothingItem {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.3 — bulk restore all items in laundry basket
   */
  markAllClean(_items: ClothingItem[]): ClothingItem[] {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.3 — items in laundry for more than overdueDays
   */
  getOverdueItems(_entries: LaundryEntry[], _today: string, _overdueDays: number): LaundryEntry[] {
    throw new Error('Not implemented');
  }

  /**
   * Spec §4.3 — end-of-day: transition worn_today items to laundry if threshold met
   */
  endOfDayTransition(_items: ClothingItem[], _today: string): ClothingItem[] {
    throw new Error('Not implemented');
  }
}
