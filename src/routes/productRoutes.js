import express from "express";
import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";
import {
  createProductController,
  deleteProductController,
  deleteProductImageController,
  getAllProductsController,
  getSingleProductController,
  getTopProductsController,
  productReviewController,
  updateProductController,
  updateProductImageController,
} from "../controllers/productController.js";
import { singleUpload } from "../middlewares/multer.js";

const productRoutes = express.Router();


productRoutes.get("/get-all", getAllProductsController);

productRoutes.get("/top", getTopProductsController);

productRoutes.get("/:id", getSingleProductController);

productRoutes.post("/create", isAuth, isAdmin, singleUpload, createProductController);

productRoutes.put("/:id", isAuth, isAdmin, updateProductController);

productRoutes.put(
  "/image/:id",
  isAuth,
  isAdmin,
  singleUpload,
  updateProductImageController
);

productRoutes.delete(
  "/delete-image/:id",
  isAuth,
  isAdmin,
  deleteProductImageController
);

productRoutes.delete("/delete/:id", isAuth, isAdmin, deleteProductController);

productRoutes.put("/:id/review", isAuth, productReviewController);


export default productRoutes;
