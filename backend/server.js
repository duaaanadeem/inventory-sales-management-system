
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
const cookieParser = require("cookie-parser");
const allowedOrigins = new Set([
  "http://localhost:3000",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim().replace(/\/+$/, "")] : []),
  ...(process.env.FRONTEND_URLS || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
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
  const pool = require("./src/config/pg-db");
  pool.query("SELECT 1")
    .then(() => res.json({ success: true, message: "Server and database are healthy" }))
    .catch((error) => {
      console.error("Health check database error:", error);
      res.status(503).json({ success: false, message: "Database is unavailable" });
    });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  const requiredEnvironment = ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
  const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
  if (missingEnvironment.length) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
  }
  const weakSecrets = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"].filter(
    (key) => process.env[key].length < 32
  );
  if (weakSecrets.length) {
    throw new Error(`JWT secrets must be at least 32 characters: ${weakSecrets.join(", ")}`);
  }

  const pool = require("./src/config/pg-db");
  await pool.query("SELECT 1");
  return app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

if (require.main === module) {
  start().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = app;