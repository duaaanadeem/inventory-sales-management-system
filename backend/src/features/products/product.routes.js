const express = require("express");
const router = express.Router();
const upload = require("./product.upload");
const { validateCreateProduct, validateUpdateProduct } = require("./product.validation");
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("./product.controller");

const { verifyToken, requireRole } = require("../../middleware/auth");

router.get("/", verifyToken, requireRole(['admin', 'staff']), getProducts);
router.get("/:id", verifyToken, requireRole(['admin', 'staff']), getProduct);

router.post("/", verifyToken, requireRole(['admin']), upload.single("image"), validateCreateProduct, createProduct);
router.put("/:id", verifyToken, requireRole(['admin']), upload.single("image"), validateUpdateProduct, updateProduct);
router.delete("/:id", verifyToken, requireRole(['admin']), deleteProduct);

module.exports = router;
