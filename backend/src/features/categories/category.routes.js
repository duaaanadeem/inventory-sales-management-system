const express = require("express");
const router = express.Router();
const { getCategories, addCategory } = require("./category.controller");

const { verifyToken, requireRole } = require("../../middleware/auth");

router.get("/", verifyToken, requireRole(['admin', 'staff']), getCategories);
router.post("/", verifyToken, requireRole(['admin']), addCategory);

module.exports = router;
