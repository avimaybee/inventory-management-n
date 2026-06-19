export interface OrderItem {
  id: string; // client-side temp id
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  feedTypeId: string;
  feedTypeName: string;
  productId: string;
  productName: string;
  packagingId: string;
  packagingName: string;
  packagingWeightKg: number;
  quantity: number;
  weightQuintals: number;
  _invalid?: boolean;
  _invalidReason?: string;
}

export interface Order {
  partyName: string;
  location: string;
  items: OrderItem[];
}
