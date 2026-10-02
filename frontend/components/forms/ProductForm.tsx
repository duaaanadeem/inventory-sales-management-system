"use client";
import { useForm } from "react-hook-form";
import type { Category, ProductPayload } from "@/lib/api";

interface ProductFormProps {
  categories: Category[];
  onSubmit: (data: ProductPayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function ProductForm({
  categories,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductPayload>({
    defaultValues: {
      price: "0",
      cost: "0",
      minStockLevel: "0",
      openingStock: "0",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Product Name *</label>
          <input
            {...register("name", { required: "Product name is required" })}
            className="input"
            placeholder="Enter product name"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">SKU *</label>
          <input
            {...register("sku", { required: "SKU is required" })}
            className="input"
            placeholder="SKU-001"
          />
          {errors.sku && <p className="mt-1 text-xs text-rose-600">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <select {...register("categoryId")} className="input">
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Price ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register("price", { required: "Price is required" })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Cost ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            {...register("cost", { required: "Cost is required" })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Opening Stock</label>
          <input type="number" min="0" step="1" {...register("openingStock")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Minimum Stock Level</label>
          <input type="number" min="0" step="1" {...register("minStockLevel")} className="input" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Product Image</label>
          <input
            type="file"
            accept="image/*"
            {...register("image")}
            className="input py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-5 border-t border-slate-200">
        <button type="button" onClick={onCancel} className="btn-secondary w-full sm:w-auto">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary w-full sm:w-auto disabled:opacity-60">
          {isSubmitting ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}