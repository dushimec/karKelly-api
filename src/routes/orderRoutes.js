import express from "express";
import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";
import {
  changeOrderStatusController,
  createOrderController,
  getAllOrdersController,
  getMyOrdersController,
  paymentsController,
  singleOrderDetailsController,
} from "../controllers/orderController.js";

const orderRoute = express.Router();

orderRoute.post("/create", isAuth, createOrderController);


orderRoute.get("/my-orders", isAuth, getMyOrdersController);


orderRoute.get("/my-orders/:id", isAuth, singleOrderDetailsController);


orderRoute.post("/payments", isAuth, paymentsController);

orderRoute.get("/admin/get-all-orders", isAuth, isAdmin, getAllOrdersController);

orderRoute.put("/admin/order/:id", isAuth, isAdmin, changeOrderStatusController);

export default orderRoute;
