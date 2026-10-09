import express from "express";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import { searchImagesController } from "../controllers/adminController.js";

const adminRoutes = express.Router();

adminRoutes.get("/image-search", isAuth, isAdmin, searchImagesController);

export default adminRoutes;
