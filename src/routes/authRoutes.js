import express from 'express';
import * as authController from '../controllers/authController';

const authRoutes = express.Router();

authRoutes.post('/login', authController.loginUser);
authRoutes.post('/register', authController.registerUser);

export default authRoutes;
