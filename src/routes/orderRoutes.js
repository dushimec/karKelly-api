import express from "express";
import { isAdmin, isAuth } from "./../middlewares/authMiddleware.js";
import {
  changeOrderStatusController,
  createOrderController,
  getAllOrdersController,
  getMyOrdersController,
  getRecentOrdersController,
  getTotalCustomersController,
  getTotalOrdersController,
  getTotalSalesController,
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

orderRoute.get("/admin/total-sales", isAuth, isAdmin, getTotalSalesController);
orderRoute.get("/admin/total-orders", isAuth, isAdmin, getTotalOrdersController);
orderRoute.get("/admin/total-customers", isAuth, isAdmin, getTotalCustomersController);
orderRoute.get("/admin/recent-orders", isAuth, isAdmin, getRecentOrdersController);

export default orderRoute;
