// Spec §3 — Clothing data structure

export type ClothingStatus = 'available' | 'worn_today' | 'laundry' | 'retired';

export type Category =
  | 'top'        // 上衣
  | 'outer'      // 外套
  | 'bottom'     // 褲子
  | 'shoes'      // 鞋子
  | 'accessory'; // 配件

export type Season = '春' | '夏' | '秋' | '冬';

export type Occasion = '上班' | '休閒' | '正式' | '居家' | '運動';

export type StylePreference = '簡約' | '街頭' | '商務' | '休閒';
export type ColorPreference = '暖色' | '冷色' | '中性色' | '大地色';

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  colors: string[];           // hex codes, e.g. ["#FFFFFF"]
  seasons: Season[];
  occasions: Occasion[];
  photo_url: string | null;
  brand: string | null;
  purchase_price: number | null;
  purchase_date: string | null; // ISO 8601
  wear_count: number;
  cost_per_wear: number | null; // null when purchase_price is null
  status: ClothingStatus;
  last_worn_date: string | null; // ISO 8601
  notes: string | null;
  wear_before_laundry: number;  // spec §4.2 — default 1, e.g. jacket = 3
  sequence_tag: string | null;  // spec §5 — e.g. "白T #001" disambiguation
}

export interface OutfitSet {
  top: ClothingItem | null;
  outer: ClothingItem | null;
  bottom: ClothingItem | null;
  shoes: ClothingItem | null;
  accessories: ClothingItem[];
  reason: string;             // one-line explanation
}

export interface OutfitRecord {
  date: string;               // ISO 8601
  outfit: OutfitSet;
  accepted: boolean;          // spec §4.4 — track accept/reject for AI learning
  photo_url: string | null;   // optional user photo of actual worn outfit
}

export interface UserPreferences {
  styles: StylePreference[];
  color_preferences: ColorPreference[];
  disliked_elements: string[];  // e.g. ["螢光色", "格紋"]
  work_dress_code: '商務休閒' | '正式' | '無限制';
  notification_time: string;    // "HH:MM", default "07:00"
  // spec §5 — repeat interval by occasion
  min_repeat_interval: {
    正式: number;   // days, default 14
    休閒: number;   // days, default 7
    居家: number;   // days, default 0
  };
  laundry_overdue_days: number; // default 5
}

export interface WeatherCondition {
  temperature: number;         // °C
  feels_like: number;
  humidity: number;
  description: string;
  indoor_temp_estimate: number | null; // spec §5 — office AC offset
}
