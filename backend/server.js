
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const salesRoutes = require("./src/features/sales/sales.routes");
app.use("/api/sales", salesRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory & Sales Management API is running"
  });
});

// API health route
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy"
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Server configuration
const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;