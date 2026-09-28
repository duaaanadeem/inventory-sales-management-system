const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const app = express();
const customerRoutes = require("./src/customers/customer.routes");
app.use("/customers", customerRoutes);
// Middleware
app.use(cors());
app.use(express.json());

// Routes
const inventoryRoutes = require("./src/features/inventory/inventory.routes");
app.use("/inventory", inventoryRoutes);

const dashboardRoutes = require("./src/features/dashboard/dashboard.routes");
app.use("/dashboard", dashboardRoutes);

const notificationRoutes = require("./src/features/notifications/notification.routes");
app.use("/notifications", notificationRoutes);

const activityRoutes = require("./src/features/activities/activity.routes");
app.use("/activities", activityRoutes);


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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});