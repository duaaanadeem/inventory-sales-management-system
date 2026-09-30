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

router.get("/", getProducts);
router.get("/:id", getProduct);

// TODO: add verifyToken + requireRole("admin") when Auth is merged
router.post("/", upload.single("image"), validateCreateProduct, createProduct);
router.put("/:id", upload.single("image"), validateUpdateProduct, updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
