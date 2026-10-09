import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import {
  createProductController,
  createProductsBulkController,
  createCarListingController,
  deleteProductController,
  deleteProductImageController,
  getAllProductsController,
  getAdminProductController,
  getAdminProductsController,
  getSingleProductController,
  getAdminCarListingController,
  getTopProductsController,
  productReviewController,
  recordProductCartInterestController,
  updateProductController,
  updateCarListingController,
  setCarPublicationStatusController,
  updateProductImageController,
} from "../controllers/productController.js";
import { multipleUpload, singleUpload } from "../middlewares/multer.js";

const productRoutes = express.Router();

productRoutes.get("/admin/get-all", isAuth, isAdmin, getAdminProductsController);
productRoutes.get("/admin/:id", isAuth, isAdmin, getAdminProductController);
productRoutes.get("/get-all", getAllProductsController);
productRoutes.get("/top", getTopProductsController);
productRoutes.post("/:id/cart-interest", isAuth, recordProductCartInterestController);
productRoutes.post("/bulk", isAuth, isAdmin, multipleUpload, createProductsBulkController);
productRoutes.post("/cars", isAuth, isAdmin, multipleUpload, createCarListingController);
productRoutes.get("/cars/:id", isAuth, isAdmin, getAdminCarListingController);
productRoutes.put("/cars/:id", isAuth, isAdmin, updateCarListingController);
productRoutes.patch("/cars/:id/publication", isAuth, isAdmin, setCarPublicationStatusController);
productRoutes.get("/:id", getSingleProductController);
productRoutes.post("/create", isAuth, isAdmin, singleUpload, createProductController);
productRoutes.put("/:id", isAuth, isAdmin, updateProductController);
productRoutes.put("/image/:id", isAuth, isAdmin, singleUpload, updateProductImageController);
productRoutes.delete("/delete-image/:id", isAuth, isAdmin, deleteProductImageController);
productRoutes.delete("/delete/:id", isAuth, isAdmin, deleteProductController);
productRoutes.put("/:id/review", isAuth, productReviewController);

export default productRoutes;
