import express from "express";
import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";
import {
  createCategory,
  deleteCategoryController,
  getAllCategoriesController,
  updateCategoryController,
} from "../controllers/categoryController.js";

const categorieRoutes = express.Router();


categorieRoutes.post("/create", isAuth, isAdmin, createCategory);

categorieRoutes.get("/get-all", getAllCategoriesController);

categorieRoutes.delete("/delete/:id", isAuth, isAdmin, deleteCategoryController);

categorieRoutes.put("/update/:id", isAuth, isAdmin, updateCategoryController);

export default categorieRoutes;
