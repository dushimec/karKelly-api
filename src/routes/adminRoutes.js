import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import {
  approveProductPixabayImageController,
  searchImagesController,
  searchProductPixabayImagesController,
} from "../controllers/adminController.js";

const adminRoutes = express.Router();

adminRoutes.get("/image-search", isAuth, isAdmin, searchImagesController);
adminRoutes.get("/products/:id/pixabay-images", isAuth, isAdmin, searchProductPixabayImagesController);
adminRoutes.post("/products/:id/pixabay-images/approve", isAuth, isAdmin, approveProductPixabayImageController);

export default adminRoutes;
