import { ClothingItem, OutfitSet, UserPreferences } from '../../src/models/clothing';

export const makeItem = (overrides: Partial<ClothingItem> = {}): ClothingItem => ({
  id: 'item-001',
  name: '白色基本款 T-shirt #001',
  category: 'top',
  colors: ['#FFFFFF'],
  seasons: ['春', '夏'],
  occasions: ['休閒', '上班'],
  photo_url: null,
  brand: 'UNIQLO',
  purchase_price: 490,
  purchase_date: '2024-09-01',
  wear_count: 0,
  cost_per_wear: null,
  status: 'available',
  last_worn_date: null,
  notes: null,
  wear_before_laundry: 1,
  sequence_tag: '白T #001',
  ...overrides,
});

export const makeBottom = (overrides: Partial<ClothingItem> = {}): ClothingItem =>
  makeItem({
    id: 'item-002',
    name: '深藍牛仔褲',
    category: 'bottom',
    colors: ['#1A237E'],
    purchase_price: 1200,
    sequence_tag: null,
    ...overrides,
  });

export const makeOuter = (overrides: Partial<ClothingItem> = {}): ClothingItem =>
  makeItem({
    id: 'item-003',
    name: '灰色薄外套',
    category: 'outer',
    colors: ['#9E9E9E'],
    wear_before_laundry: 3,
    sequence_tag: null,
    ...overrides,
  });

export const makeShoes = (overrides: Partial<ClothingItem> = {}): ClothingItem =>
  makeItem({
    id: 'item-004',
    name: '白色休閒鞋',
    category: 'shoes',
    colors: ['#FAFAFA'],
    sequence_tag: null,
    ...overrides,
  });

export const makeOutfitSet = (overrides: Partial<OutfitSet> = {}): OutfitSet => ({
  top: makeItem(),
  outer: makeOuter(),
  bottom: makeBottom(),
  shoes: makeShoes(),
  accessories: [],
  reason: '天氣涼爽，休閒風格搭配',
  ...overrides,
});

export const makePreferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  styles: ['簡約'],
  color_preferences: ['中性色'],
  disliked_elements: ['螢光色'],
  work_dress_code: '商務休閒',
  notification_time: '07:00',
  min_repeat_interval: {
    正式: 14,
    休閒: 7,
    居家: 0,
  },
  laundry_overdue_days: 5,
  ...overrides,
});
