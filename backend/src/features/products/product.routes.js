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

// GET routes: confirmed with Ali as read-only, no auth required for now.
router.get("/", getProducts);
router.get("/:id", getProduct);

// Order matters: multer parses multipart -> validation checks req.body -> controller.
// TODO: add verifyToken + requireRole("admin") here once Auth module is merged
// (per SRS, only Admin can add/edit/delete products).
router.post("/", upload.single("image"), validateCreateProduct, createProduct);
router.put("/:id", upload.single("image"), validateUpdateProduct, updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;
