// Utility functions for sales calculations
const toCents = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Money values must be non-negative numbers");
  }

  return Math.round(number * 100);
};

const fromCents = (value) => (value / 100).toFixed(2);

// Calculate totals for a sale, including subtotal, discount, tax, and total
const calculateTotals = (items, discount = 0, taxRate = 0) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one sale item is required");
  }

  const subtotalCents = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Item quantities must be positive integers");
    }
    return sum + toCents(item.unitPrice) * quantity;
  }, 0);

  const discountCents = toCents(discount);
  if (discountCents > subtotalCents) {
    throw new Error("Discount cannot exceed subtotal");
  }

  const rate = Number(taxRate);
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("Tax rate must be a non-negative number");
  }

  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * rate / 100);

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    tax: fromCents(taxCents),
    total: fromCents(taxableCents + taxCents)
  };
};

module.exports = { calculateTotals };
