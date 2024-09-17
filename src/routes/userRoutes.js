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
  getAllUsersController,
  verifyEmailController
} from "../controllers/userController.js";
import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";
import { singleUpload } from "../middlewares/multer.js";

const usersRoutes = express.Router();

usersRoutes.post("/register", singleUpload, registerController);
usersRoutes.post("/login", loginController);
usersRoutes.get("/verify-email", verifyEmailController);
usersRoutes.get("/profile", isAuth, getUserProfileController);
usersRoutes.get("/logout", isAuth, logoutController);
usersRoutes.put("/profile-update", isAuth, updateProfileController);
usersRoutes.put("/update-password", isAuth, udpatePasswordController);
usersRoutes.put("/update-picture", isAuth, singleUpload, updateProfilePicController);
usersRoutes.post("/forget-password", passwordResetController);
usersRoutes.get("/all", isAuth,isAdmin, getAllUsersController); 

export default usersRoutes;
