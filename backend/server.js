
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
const cookieParser = require("cookie-parser");
app.use(cors({
    origin: 'http://localhost:3000', // Update this based on the frontend URL
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const customerRoutes = require("./src/customers/customer.routes");
app.use("/api/customers", customerRoutes);

const inventoryRoutes = require("./src/features/inventory/inventory.routes");
app.use("/api/inventory", inventoryRoutes);

const dashboardRoutes = require("./src/features/dashboard/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);

const notificationRoutes = require("./src/features/notifications/notification.routes");
app.use("/api/notifications", notificationRoutes);

const activityRoutes = require("./src/features/activities/activity.routes");
app.use("/api/activities", activityRoutes);

const productRoutes = require("./src/features/products/product.routes");
app.use("/api/products", productRoutes);

const categoryRoutes = require("./src/features/categories/category.routes");
app.use("/api/categories", categoryRoutes);

const salesRoutes = require("./src/features/sales/sales.routes");
app.use("/api/sales", salesRoutes);


const supplierRoutes = require("./src/features/suppliers/supplier.routes");
app.use("/api/suppliers", supplierRoutes);

const purchaseRoutes = require("./src/features/purchases/purchase.routes");
app.use("/api/purchases", purchaseRoutes);

const authRoutes = require("./src/features/auth/auth.routes");
app.use("/api/auth", authRoutes);

const reportsRoutes = require("./src/features/reports/reports.routes");
app.use("/api/reports", reportsRoutes);

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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;