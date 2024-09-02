import cron from "node-cron";
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
  await order
    .populate("user", "name")
    .populate("orderItems.product", "name")
    .execPopulate();
    const productName = order.orderItems
    .map((item) => item.product.name)
    .join(", ");
  const message = {
    body: `New Order Placed: Order #${productName} has been placed by ${order.user.name}.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ADMIN_PHONE_NUMBER,
  };

  try {
    const response = await client.messages.create(message);
    console.log("SMS notification sent successfully", response.sid);
  } catch (error) {
    console.error(
      "Error sending SMS notification:",
      error.message,
      error.moreInfo
    );
  }
};

const sendNotificationToUser = async (orders) => {
  await orders
    .populate("user", "name phone")
    .populate("orderItems.product", "name")
    .execPopulate();

  const productNames = orders.orderItems
    .map((item) => item.product.name)
    .join(", ");

  const message = {
    body: `KARY KELLY RWANDA, Mukiriya wacu urakoze gutumiza ${productNames}, mwihutire kwishyura vuba kuko nyuma y'iminsi 2 mutarishyura ibyo mwatumije tuzagihagarika murakoze.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: orders.user.phone,
  };

  try {
    const response = await client.messages.create(message);
    console.log("SMS notification sent successfully to user", response.sid);
  } catch (error) {
    console.error(
      "Error sending SMS notification to user:",
      error.message,
      error.moreInfo
    );
  }
};

const cancelOldProcessingOrders = async () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  try {
    const ordersToCancel = await orderModel.find({
      orderStatus: "processing",
      createdAt: { $lt: twoDaysAgo },
    });

    for (const order of ordersToCancel) {
      order.orderStatus = "canceled";
      order.canceledAt = Date.now();
      await updateProductStock(order.orderItems, true);
      await order.save();
      console.log(`Order #${order._id} has been canceled due to inactivity.`);
    }
  } catch (error) {
    console.error("Error canceling old processing orders:", error.message);
  }
};

cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled task to cancel old processing orders...");
  cancelOldProcessingOrders();
});

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

  await Promise.all([
    updateProductStock(orderItems),
    sendNotificationToAdmin(order),
    sendNotificationToUser(order),
  ]);

  return order;
};
