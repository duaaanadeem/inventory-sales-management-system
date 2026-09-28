const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const customerRoutes = require("./src/customers/customer.routes");
app.use("/customers", customerRoutes);

const inventoryRoutes = require("./src/features/inventory/inventory.routes");
app.use("/inventory", inventoryRoutes);

const dashboardRoutes = require("./src/features/dashboard/dashboard.routes");
app.use("/dashboard", dashboardRoutes);

const productRoutes = require("./src/features/products/product.routes");
app.use("/api/products", productRoutes);

const categoryRoutes = require("./src/features/categories/category.routes");
app.use("/api/categories", categoryRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory & Sales Management API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});