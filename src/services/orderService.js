import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";

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

  for (let i = 0; i < orderItems.length; i++) {
    const product = await productModel.findById(orderItems[i].product);
    product.stock -= orderItems[i].quantity;
    await product.save();
  }

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

export const getRecentOrders = async (limit = 5) => {
  return await orderModel.find().sort({ createdAt: -1 }).limit(limit).populate('user');
};
