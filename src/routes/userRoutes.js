import express from "express";
import {
  getUserProfileController,
  loginController,
  logoutController,
  passwordResetController,
  registerController,
  udpatePasswordController,
  updateProfileController,
  updateProfilePicController,
} from "../controllers/userController.js";
import { isAuth } from "../middlewares/authMiddleware.js";
import { singleUpload } from "../middlewares/multer.js";





const usersRoutes = express.Router();

usersRoutes.post("/register",  registerController);

usersRoutes.post("/login", loginController);

usersRoutes.get("/profile", isAuth, getUserProfileController);

usersRoutes.get("/logout", isAuth, logoutController);

usersRoutes.put("/profile-update", isAuth, updateProfileController);

usersRoutes.put("/update-password", isAuth, udpatePasswordController);

usersRoutes.put("/update-picture", isAuth, singleUpload, updateProfilePicController);

usersRoutes.post("/reset-password", passwordResetController);


export default usersRoutes;
