const express = require("express");
const router = express.Router();
const { getCategories, addCategory } = require("./category.controller");

// TODO: add verifyToken + requireRole("admin") on POST once Auth module is merged.
router.get("/", getCategories);
router.post("/", addCategory);

module.exports = router;
