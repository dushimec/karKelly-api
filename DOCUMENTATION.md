# Project Documentation

## Project Structure

```plaintext
📁 api
  - 📄 **`src\api\index.js`**: _// api/index.js
📁 config
  - 📄 **`src\config\cloudinaryConfig.js`**: _import cloudinary from 'cloudinary';
  - 📄 **`src\config\dbConnection.js`**: _import mongoose from 'mongoose'
  - 📄 **`src\config\firebase.js`**: _import admin from "firebase-admin";
  - 📄 **`src\config\rateLimit.js`**: _import rateLimit from 'express-rate-limit'
  - 📄 **`src\config\twilio.js`**: _import twilio from 'twilio';
📁 controllers
  - 📄 **`src\controllers\categoryController.js`**: _import * as categoryService from '../services/categoryService.js';
  - 📄 **`src\controllers\orderController.js`**: _import * as orderService from "../services/orderService.js";
  - 📄 **`src\controllers\productController.js`**: _import { sendProductCreationEmail } from '../services/emailService.js';
  - 📄 **`src\controllers\userController.js`**: _import * as userService from '../services/userService.js';
📁 helpers
  - 📄 **`src\helpers\error-handler.js`**: _export const notFound = (req, res, next) => {
  - 📄 **`src\i18n.js`**: _import i18next from "i18next";
📁 locales
📁 en
  - 📄 **`src\locales\en\translation.json`**: _{
📁 rw
  - 📄 **`src\locales\rw\translation.json`**: _{
📁 middlewares
  - 📄 **`src\middlewares\authMiddleware.js`**: _import JWT from "jsonwebtoken";
  - 📄 **`src\middlewares\multer.js`**: _import multer from "multer";
📁 models
  - 📄 **`src\models\categoryModel.js`**: _import mongoose from "mongoose";
  - 📄 **`src\models\orderModel.js`**: _import mongoose from "mongoose";
  - 📄 **`src\models\productModel.js`**: _import mongoose from "mongoose";
  - 📄 **`src\models\userModel.js`**: _import mongoose from "mongoose";
📁 routes
  - 📄 **`src\routes\categoryRoutes.js`**: _import express from "express";
  - 📄 **`src\routes\orderRoutes.js`**: _import express from "express";
  - 📄 **`src\routes\productRoutes.js`**: _import express from "express";
  - 📄 **`src\routes\userRoutes.js`**: _import express from "express";
📁 services
  - 📄 **`src\services\categoryService.js`**: _import categoryModel from "../models/categoryModel.js";
  - 📄 **`src\services\emailService.js`**: _import nodemailer from "nodemailer";
  - 📄 **`src\services\orderService.js`**: _import orderModel from "../models/orderModel.js";
  - 📄 **`src\services\productService.js`**: _import mongoose from 'mongoose'; 
  - 📄 **`src\services\userService.js`**: _import userModel from "../models/userModel.js";
📁 utils
  - 📄 **`src\utils\features.js`**: _import DataURIParser from "datauri/parser.js";
```