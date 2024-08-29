import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from '../models/userModel.js';

const updateProductStock = async (orderItems, increment = false) => {
  for (let i = 0; i < orderItems.length; i++) {
    const product = await productModel.findById(orderItems[i].product);
    if (product) {
      product.stock += increment ? orderItems[i].quantity : -orderItems[i].quantity;
      await product.save();
    }
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

  const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const order = await orderModel.create({
    user,
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
    totalAmount,
  });

  // Decrease stock for the products in the order
  await updateProductStock(orderItems);

  return order;
};

export const getMyOrders = async (userId) => {
  return await orderModel.find({ user: userId }).populate('user');
};

export const getOrderById = async (id) => {
  return await orderModel.findById(id).populate('user');
};

export const getTotalSales = async () => {
  const totalSales = await orderModel.aggregate([
    { $group: { _id: null, totalSales: { $sum: "$totalAmount" } } }
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
  return await orderModel.find().populate('user');
};

export const getRecentOrders = async (limit = 3) => {
  return await orderModel.find().sort({ createdAt: -1 }).limit(limit).populate('user');
};

export const updateOrderStatus = async (orderId, status) => {
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Order not found");

  order.orderStatus = status;

  if (status === "delivered") {
    order.deliveredAt = Date.now();
  } else if (status === "canceled") {
    order.canceledAt = Date.now();
    // Update product stock if the order is canceled
    await updateProductStock(order.orderItems, true);
  } else if (status === "shipped") {
    order.shippedAt = Date.now();
  }

  await order.save();
  return order;
};
