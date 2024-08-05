import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userMdoel from "../models/userModel.js";
import axios from 'axios';

export const createOrder = async (orderData) => {
  const {
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
    user,
  } = orderData;

  const order = await orderModel.create({
    user,
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
  });

  for (let i = 0; i < orderItems.length; i++) {
    const product = await productModel.findById(orderItems[i].product);
    product.stock -= orderItems[i].quantity;
    await product.save();
  }

  return order;
};

export const getMyOrders = async (userId) => {
  return await orderModel.find({ user: userId });
};

export const getOrderById = async (id) => {
  return await orderModel.findById(id);
};

export const processPayment = async (totalAmount) => {
  if (!totalAmount) {
    throw new Error("Total Amount is required");
  }

  const amountInCents = Number(totalAmount * 100);
  const apiUser = process.env.MTN_API_USER;
  const apiKey = process.env.MTN_API_KEY;
  const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY;
  const targetEnvironment = 'sandbox';

  const headers = {
    'Authorization': `Basic ${Buffer.from(`${apiUser}:${apiKey}`).toString('base64')}`,
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    'X-Target-Environment': targetEnvironment,
    'Content-Type': 'application/json',
  };

  const paymentData = {
    amount: amountInCents.toString(),
    currency: 'RWF',
    externalId: '123456789',
    payer: {
      partyIdType: 'MSISDN',
      partyId: '250XXXXXXX',
    },
    payerMessage: 'Payment for services',
    payeeNote: 'Thank you for your payment',
  };

  const response = await axios.post(
    'https://sandbox.mtn.com/collection/v1_0/requesttopay',
    paymentData,
    { headers }
  );

  if (response.status !== 202) {
    throw new Error('Failed to initiate payment');
  }

  return response.data;
};

export const getAllOrders = async () => {
  return await orderModel.find({});
};

export const changeOrderStatus = async (id) => {
  const order = await orderModel.findById(id);
  if (!order) {
    throw new Error("Order not found");
  }

  if (order.orderStatus === "processing") {
    order.orderStatus = "shipped";
  } else if (order.orderStatus === "shipped") {
    order.orderStatus = "delivered";
    order.deliveredAt = Date.now();
  } else {
    throw new Error("Order already delivered");
  }

  await order.save();
  return order;
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
  const totalCustomers = await userMdoel.countDocuments();
  return totalCustomers;
};

export const getRecentOrders = async (limit = 5) => {
  return await orderModel.find().sort({ createdAt: -1 }).limit(limit);
};