export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthenticated");
  }

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.error || body.message || "Request failed");
  }

  return body;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  category_name: string | null;
  price: number;
  cost: number;
  image_url: string | null;
  min_stock_level: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPayload {
  sku: string;
  name: string;
  categoryId?: string;
  price: string;
  cost: string;
  minStockLevel: string;
  openingStock: string;
  image?: File | FileList;
}

export async function getProducts(params: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
} = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  query.set("page", String(params.page || 1));
  query.set("limit", String(params.limit || 100));

  return request<Product[]>(`/api/products?${query.toString()}`);
}

export async function getCategories() {
  return request<Category[]>("/api/categories");
}

export async function createProduct(payload: ProductPayload) {
  const formData = new FormData();
  formData.append("sku", payload.sku);
  formData.append("name", payload.name);
  formData.append("price", payload.price);
  formData.append("cost", payload.cost);
  formData.append("minStockLevel", payload.minStockLevel || "0");
  formData.append("openingStock", payload.openingStock || "0");
  if (payload.categoryId) formData.append("categoryId", payload.categoryId);
  const imageFile = payload.image instanceof FileList ? payload.image[0] : payload.image;
  if (imageFile) formData.append("image", imageFile);

  return request<Product>("/api/products", {
    method: "POST",
    body: formData,
  });
}

export async function deleteProduct(id: number) {
  return request<unknown>(`/api/products/${id}`, { method: "DELETE" });
}

export async function updateProduct(id: number, payload: ProductPayload) {
  const formData = new FormData();
  if (payload.sku) formData.append("sku", payload.sku);
  if (payload.name) formData.append("name", payload.name);
  if (payload.price) formData.append("price", String(payload.price));
  if (payload.cost) formData.append("cost", String(payload.cost));
  if (payload.minStockLevel !== undefined) formData.append("minStockLevel", String(payload.minStockLevel));
  if (payload.categoryId) formData.append("categoryId", payload.categoryId);
  
  const imageFile = payload.image instanceof FileList ? payload.image[0] : payload.image;
  if (imageFile) formData.append("image", imageFile);

  return request<Product>(`/api/products/${id}`, {
    method: "PUT",
    body: formData,
  });
}

export async function createCategory(name: string) {
  return request<Category>("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
}
