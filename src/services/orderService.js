import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { client } from "../config/twilio.js";
import "dotenv/config";

const updateProductStock = async (orderItems, increment = false) => {
  for (const item of orderItems) {
    const product = await productModel.findById(item.product);
    if (product) {
      product.stock += increment ? item.quantity : -item.quantity;
      await product.save();
    }
  }
};

const sendNotificationToAdmin = async (order) => {
  await order.populate("user", "name").execPopulate();
  const message = {
    body: `New Order Placed: Order #${order._id} has been placed by ${order.user.name}.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ADMIN_PHONE_NUMBER,
  };

  try {
    const response = await client.messages.create(message);
    console.log("SMS notification sent successfully", response.sid);
  } catch (error) {
    console.error("Error sending SMS notification:", error.message, error.moreInfo);
  }
};


export const createOrder = async (orderData) => {
  const {
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
    user,
  } = orderData;

  const totalAmount = orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const order = await orderModel.create({
    user,
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
    totalAmount,
  });

  await updateProductStock(orderItems);
  await sendNotificationToAdmin(order);

  return order;
};

export const getMyOrders = async (userId) => {
  return await orderModel.find({ user: userId }).populate("user");
};

export const getOrderById = async (id) => {
  return await orderModel.findById(id).populate("user");
};

export const getTotalSales = async () => {
  const totalSales = await orderModel.aggregate([
    { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } },
  ]);
  return totalSales[0]?.totalSales || 0;
};

export const getTotalOrders = async () => {
  const totalOrders = await orderModel.countDocuments();
  return totalOrders;
};

export const getTotalCustomers = async () => {
  const totalCustomers = await userModel.countDocuments();
  return totalCustomers;
};

export const getAllOrders = async () => {
  return await orderModel.find().populate("user");
};

export const getRecentOrders = async (limit = 3) => {
  return await orderModel
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user");
};

export const updateOrderStatus = async (orderId, status) => {
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.orderStatus = status;

  if (status === "delivered") {
    order.deliveredAt = Date.now();
  } else if (status === "canceled") {
    order.canceledAt = Date.now();
    await updateProductStock(order.orderItems, true);
  } else if (status === "shipped") {
    order.shippedAt = Date.now();
  }

  await order.save();
  return order;
};
