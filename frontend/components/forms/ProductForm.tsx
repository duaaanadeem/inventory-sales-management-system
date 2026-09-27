"use client";
import { useForm } from "react-hook-form";

interface ProductFormData {
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  image?: FileList;
}

export default function ProductForm() {
  const { register, handleSubmit } = useForm<ProductFormData>();

  const onSubmit = (data: ProductFormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card max-w-3xl">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
        Add Product
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            Product Name *
          </label>
          <input
            {...register("name", { required: true })}
            className="input"
            placeholder="Enter product name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">SKU *</label>
          <input
            {...register("sku", { required: true })}
            className="input"
            placeholder="SKU-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Category *</label>
          <select {...register("category")} className="input">
            <option value="">Select category</option>
            <option value="accessories">Accessories</option>
            <option value="electronics">Electronics</option>
            <option value="displays">Displays</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Price ($) *</label>
          <input
            type="number"
            step="0.01"
            {...register("price", { required: true })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Cost ($)</label>
          <input
            type="number"
            step="0.01"
            {...register("cost")}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Stock Qty</label>
          <input type="number" {...register("stock")} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Min Stock Level
          </label>
          <input type="number" {...register("minStock")} className="input" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1.5">
            Product Image
          </label>
          <input
            type="file"
            accept="image/*"
            {...register("image")}
            className="input py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md
                       file:border-0 file:bg-primary-50 file:text-primary-700 file:text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end mt-6 pt-5 border-t border-gray-200">
        <button type="button" className="btn-secondary w-full sm:w-auto">
          Cancel
        </button>
        <button type="submit" className="btn-primary w-full sm:w-auto">
          Save Product
        </button>
      </div>
    </form>
  );
}