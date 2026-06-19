export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface FeedType {
  id: string;
  categoryId: string;
  name: string;
}

export interface Product {
  id: string;
  feedTypeId: string;
  brandId: string;
  name: string;
}

export interface Packaging {
  id: string;
  productId?: string; // Optional: if specific to product. If empty, applies universally or to many.
  weightKg: number;
  name: string;
}

export interface Party {
  id: string;
  name: string;
  locations: string[];
}

export const PARTIES: Party[] = [
  { id: 'party-1', name: 'Ravi Enterprises', locations: ['Ludhiana', 'Jalandhar'] },
  { id: 'party-2', name: 'Sharma Dairy Farms', locations: ['Moga'] },
  { id: 'party-3', name: 'Kisan Agro', locations: ['Amritsar', 'Patiala'] },
  { id: 'party-4', name: 'Verma Feeds', locations: [] }
];

export const BRANDS: Brand[] = [
  { id: 'neelam', name: 'Neelam Supreme' },
  { id: 'standard', name: 'Standard Choice' },
];

export const CATEGORIES: Category[] = [
  { id: 'cattle', name: 'Cattle' },
  { id: 'poultry', name: 'Poultry' },
  { id: 'swine', name: 'Swine' },
  { id: 'goat', name: 'Goat' },
  { id: 'sheep', name: 'Sheep' },
];

export const FEED_TYPES: FeedType[] = [
  { id: 'cattle-dairy', categoryId: 'cattle', name: 'Dairy Concentrate' },
  { id: 'cattle-calf', categoryId: 'cattle', name: 'Calf Starter' },
  { id: 'poultry-broiler', categoryId: 'poultry', name: 'Broiler Feed' },
  { id: 'poultry-layer', categoryId: 'poultry', name: 'Layer Feed' },
  { id: 'swine-grower', categoryId: 'swine', name: 'Grower Ration' },
  { id: 'goat-finisher', categoryId: 'goat', name: 'Finisher Mix' },
];

export const PRODUCTS: Product[] = [
  { id: 'p1', feedTypeId: 'cattle-dairy', brandId: 'neelam', name: 'Neelam Dairy Max 1000' },
  { id: 'p2', feedTypeId: 'cattle-dairy', brandId: 'standard', name: 'Standard Dairy Plus' },
  { id: 'p3', feedTypeId: 'cattle-calf', brandId: 'neelam', name: 'Neelam Calf Boost' },
  { id: 'p4', feedTypeId: 'poultry-broiler', brandId: 'neelam', name: 'Broiler Primo Starter' },
  { id: 'p5', feedTypeId: 'poultry-broiler', brandId: 'neelam', name: 'Broiler Primo Finisher' },
];

export const PACKAGING: Packaging[] = [
  { id: 'pkg-25', weightKg: 25, name: '25kg Bag' },
  { id: 'pkg-50', weightKg: 50, name: '50kg Bag' },
];

export function getCategories() {
  return CATEGORIES;
}

export function getBrands() {
  return BRANDS;
}

export function getFeedTypes(categoryId?: string) {
  if (!categoryId) return FEED_TYPES;
  return FEED_TYPES.filter(ft => ft.categoryId === categoryId);
}

export function getProducts(brandId?: string, feedTypeId?: string) {
  let filtered = PRODUCTS;
  if (brandId) filtered = filtered.filter(p => p.brandId === brandId);
  if (feedTypeId) filtered = filtered.filter(p => p.feedTypeId === feedTypeId);
  return filtered;
}

export function getPackaging() {
  return PACKAGING;
}
