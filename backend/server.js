const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Must run before requiring pg-db, which reads DATABASE_URL immediately
dotenv.config();

const pool = require("./src/config/pg-db");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const productRoutes = require("./src/features/products/product.routes");
const categoryRoutes = require("./src/features/categories/category.routes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded product images, e.g. http://localhost:5000/uploads/products/product-123.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({ success: true, message: "Inventory & Sales Management API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is healthy" });
});

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler must always be registered LAST
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

pool.connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
