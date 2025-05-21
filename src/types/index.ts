// src/types/index.ts
export interface SelectOption {
  value: string;
  label: string;
}

export interface PurchaseItem {
  id: string; // Unique ID for the item in the list (e.g., UUID)
  clinicCode: string;
  quantity: number;
  price: number;
  itemName: string;
}

export interface AdminManagedItem {
  id: string;
  name: string;
}

export interface Partner {
  id: string;
  name: string;
}
