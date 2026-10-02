const express = require("express");
const router = express.Router();
const dashboardController = require("./dashboard.controller");
const { verifyToken, requireRole } = require("../../middleware/auth");

router.get("/", verifyToken, requireRole(['admin']), dashboardController.getDashboard);

module.exports = router;