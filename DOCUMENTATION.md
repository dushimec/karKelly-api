# Project Documentation

## Project Structure

```plaintext
📁 api
  - 📄 **`src\api\index.js`**: _// api/index.js import app from "../../app.js";_
📁 config
  - 📄 **`src\config\cloudinaryConfig.js`**: _import cloudinary from 'cloudinary'; cloudinary.v2.config({_
  - 📄 **`src\config\dbConnection.js`**: _import mongoose from 'mongoose' import 'dotenv/config'_
  - 📄 **`src\config\firebase.js`**: _import admin from "firebase-admin"; import 'dotenv/config'_
  - 📄 **`src\config\rateLimit.js`**: _import rateLimit from 'express-rate-limit' const requestRateLimitConfig = rateLimit({_
  - 📄 **`src\config\twilio.js`**: _import twilio from 'twilio'; import 'dotenv/config'_
📁 controllers
  - 📄 **`src\controllers\categoryController.js`**: _import * as categoryService from '../services/categoryService.js'; export const createCategory = async (req, res) => {_
  - 📄 **`src\controllers\orderController.js`**: _import * as orderService from "../services/orderService.js"; export const createOrderController = async (req, res) => {_
  - 📄 **`src\controllers\productController.js`**: _import { sendProductCreationEmail } from '../services/emailService.js'; import * as productService from '../services/productService.js';_
  - 📄 **`src\controllers\userController.js`**: _import * as userService from '../services/userService.js'; export const registerController = async (req, res) => {_
📁 helpers
  - 📄 **`src\helpers\error-handler.js`**: _export const notFound = (req, res, next) => {     const error = new Error(`Not Found: ${req.originalUrl}`);_
  - 📄 **`src\i18n.js`**: _import i18next from "i18next"; import Backend from "i18next-fs-backend";_
📁 locales
📁 en
  - 📄 **`src\locales\en\translation.json`**: _{     "category_created": "{{category}} category created successfully",_
📁 rw
  - 📄 **`src\locales\rw\translation.json`**: _{     "category_created": "Icyiciro {{category}} cyakozwe neza",_
📁 middlewares
  - 📄 **`src\middlewares\authMiddleware.js`**: _import JWT from "jsonwebtoken"; import userModel from '../models/userModel.js'_
  - 📄 **`src\middlewares\multer.js`**: _import multer from "multer"; // Use memory storage for Multer_
📁 models
  - 📄 **`src\models\categoryModel.js`**: _import mongoose from "mongoose"; const categorySchema = new mongoose.Schema(_
  - 📄 **`src\models\orderModel.js`**: _import mongoose from "mongoose"; const orderSchema = new mongoose.Schema(_
  - 📄 **`src\models\productModel.js`**: _import mongoose from "mongoose"; const productSchema = new mongoose.Schema(_
  - 📄 **`src\models\userModel.js`**: _import mongoose from "mongoose"; import bcrypt from "bcryptjs";_
📁 routes
  - 📄 **`src\routes\categoryRoutes.js`**: _import express from "express"; import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";_
  - 📄 **`src\routes\orderRoutes.js`**: _import express from "express"; import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";_
  - 📄 **`src\routes\productRoutes.js`**: _import express from "express"; import { isAdmin, isAuth } from "../middlewares/authMiddleware.js";_
  - 📄 **`src\routes\userRoutes.js`**: _import express from "express"; import {_
📁 services
  - 📄 **`src\services\categoryService.js`**: _import categoryModel from "../models/categoryModel.js"; import productModel from "../models/productModel.js";_
  - 📄 **`src\services\emailService.js`**: _import nodemailer from "nodemailer"; import userModel from "../models/userModel.js";_
  - 📄 **`src\services\orderService.js`**: _import orderModel from "../models/orderModel.js"; import userModel from "../models/userModel.js";_
  - 📄 **`src\services\productService.js`**: _import mongoose from 'mongoose';  import productModel from "../models/productModel.js";_
  - 📄 **`src\services\userService.js`**: _import userModel from "../models/userModel.js"; import cloudinary from "cloudinary";_
📁 utils
  - 📄 **`src\utils\features.js`**: _import DataURIParser from "datauri/parser.js"; import path from "path";_
```
