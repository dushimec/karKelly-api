import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import mongoose from "mongoose";
import { getTwilioClient } from "../config/twilio.js";
import cron from "node-cron";
import "dotenv/config";
import { sendAdminOrderEmail, sendReceiptEmail } from "./emailService.js";
import { recordPurchasedProductInterests } from "./productInterestService.js";

/**
 * Get all orders from the database.
 * @returns {Promise<Array>} List of all orders.
 */
export const getAllOrders = async () => {
  try {
    // Fetch all orders from the database
    const orders = await orderModel
      .find()
      .populate("user", "name email") // Populate user details
      .populate("orderItems.product", "name price"); // Populate product details
    return orders;
  } catch (error) {
    console.error("Error fetching all orders:", error.message);
    throw new Error("Failed to fetch all orders");
  }
};

/**
 * Get total sales amount from all orders.
 * @returns {Promise<Number>} Total sales amount.
 */
export const getTotalSales = async () => {
  try {
    const result = await orderModel.aggregate([
      {
        $match: {
          orderStatus: { $nin: ["canceled", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
        },
      },
    ]);

    return result[0]?.totalSales || 0;
  } catch (error) {
    console.error("Error calculating total sales:", error.message);
    throw new Error("Failed to calculate total sales");
  }
};

/**
 * Get total number of orders.
 * @returns {Promise<Number>} Total number of orders.
 */
export const getTotalOrders = async () => {
  try {
    const totalOrders = await orderModel.countDocuments();
    return totalOrders;
  } catch (error) {
    console.error("Error fetching total orders:", error.message);
    throw new Error("Failed to fetch total orders");
  }
};

/**
 * Get total number of customers.
 * @returns {Promise<Number>} Total number of unique customers.
 */
export const getTotalCustomers = async () => {
  try {
    const totalCustomers = await userModel.countDocuments();
    return totalCustomers;
  } catch (error) {
    console.error("Error fetching total customers:", error.message);
    throw new Error("Failed to fetch total customers");
  }
};

/**
 * Get all orders for a specific user.
 * @param {String} userId - ID of the user whose orders are to be fetched.
 * @returns {Promise<Array>} List of orders for the user.
 */
export const getMyOrders = async (userId) => {
  try {
    // Fetch all orders for the specified user
    const orders = await orderModel
      .find({ user: userId })
      .populate("orderItems.product", "name price") // Populate product details
      .populate("user", "name email"); // Populate user details

    return orders;
  } catch (error) {
    console.error("Error fetching user orders:", error.message);
    throw new Error("Failed to fetch user orders");
  }
};

/**
 * Get a list of recent orders.
 * @param {Number} limit - Number of recent orders to fetch.
 * @returns {Promise<Array>} List of recent orders.
 */
export const getRecentOrders = async (limit = 5) => {
  try {
    const recentOrders = await orderModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name email")
      .populate("orderItems.product", "name price");

    return recentOrders;
  } catch (error) {
    console.error("Error fetching recent orders:", error.message);
    throw new Error("Failed to fetch recent orders");
  }
};

/**
 * Update the product stock.
 * @param {Array} orderItems - List of order items with product and quantity.
 * @param {Boolean} increment - Whether to increment or decrement the stock.
 */
/**
 * Update the status of an order.
 * @param {String} orderId
 * @param {String} status
 * @returns {Promise<Object>}
 */
export const updateOrderStatus = async (orderId, status) => {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const error = new Error("Invalid Order ID");
    error.statusCode = 400;
    throw error;
  }
  const validStatuses = ["processing", "shipped", "delivered", "canceled", "refunded"];
  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid status provided");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  let updatedOrder;
  try {
    await session.withTransaction(async () => {
      const order = await orderModel.findById(orderId).session(session);
      if (!order) throw new Error("Order not found");
      if (order.orderStatus === status) {
        updatedOrder = order;
        return;
      }
      if (["canceled", "refunded"].includes(order.orderStatus)) {
        const error = new Error("Canceled and refunded orders cannot be changed");
        error.statusCode = 409;
        throw error;
      }
      const transitions = {
        processing: ["shipped", "delivered", "canceled", "refunded"],
        shipped: ["delivered", "canceled", "refunded"],
        delivered: ["refunded"],
      };
      if (!transitions[order.orderStatus]?.includes(status)) {
        const error = new Error(`Cannot change order from ${order.orderStatus} to ${status}`);
        error.statusCode = 409;
        throw error;
      }

      if (["canceled", "refunded"].includes(status) && order.inventoryDeducted && !order.inventoryRestored) {
        for (const item of order.orderItems) {
          await productModel.updateOne(
            { _id: item.product },
            { $inc: { stock: item.quantity } },
            { session }
          );
        }
        order.inventoryRestored = true;
      }
      order.orderStatus = status;
      if (status === "canceled") order.canceledAt = new Date();
      updatedOrder = await order.save({ session });
    });
  } finally {
    await session.endSession();
  }
  return updatedOrder;
}

/**
 * Send SMS notification to admin.
 * @param {Object} order - The order for which notification is to be sent.
 */
const sendNotificationToAdmin = async (order) => {
  if (!process.env.TWILIO_PHONE_NUMBER || !process.env.ADMIN_PHONE_NUMBER) {
    throw new Error("Twilio order SMS requires TWILIO_PHONE_NUMBER and ADMIN_PHONE_NUMBER");
  }
  await order.populate({ path: "user", select: "name" });
  const productSummary = order.orderItems
    .map((item) => `${item.name} x${item.quantity}`)
    .join(", ")
    .slice(0, 700);
  const message = {
    body: `KAR KELLY: New order ${order._id}. Customer: ${order.user?.name || "Customer"}. Items: ${productSummary}. Total: RWF ${Number(order.totalAmount).toLocaleString("en-RW")}.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: process.env.ADMIN_PHONE_NUMBER,
  };

  const response = await getTwilioClient().messages.create(message);
  console.log("Order SMS notification sent successfully", response.sid);
};

/**
 * Cancel old processing orders.
 */
const cancelOldProcessingOrders = async () => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  try {
    console.log("Finding processing orders older than two days...");
    const ordersToCancel = await orderModel.find({
      orderStatus: "processing",
      inventoryDeducted: true,
      createdAt: { $lt: twoDaysAgo },
    });

    console.log(`Found ${ordersToCancel.length} orders to cancel.`);
    if (ordersToCancel.length === 0) {
      console.log("No orders to cancel.");
      return;
    }

    for (const order of ordersToCancel) {
      await updateOrderStatus(order._id.toString(), "canceled");
      console.log(`Order #${order._id} has been canceled due to inactivity.`);
    }
  } catch (error) {
    console.error("Error canceling old processing orders:", error.message);
  }
};

export const startOrderJobs = () => {
  void cancelOldProcessingOrders();

  cron.schedule("0 0 * * *", () => {
    console.log("Running scheduled task to cancel old processing orders...");
    void cancelOldProcessingOrders();
  });
};

/**
 * Create a new order and send notifications.
 * @param {Object} orderData - The data for the new order.
 * @returns {Promise<Object>} The created order.
 */
export const createOrder = async (orderData) => {
  const {
    shippingInfo,
    orderItems,
    paymentMethod,
    paymentInfo,
    itemPrice,
    user,
  } = orderData;

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    const error = new Error("An order must contain at least one item");
    error.statusCode = 400;
    throw error;
  }
  const idempotencyKey = String(
    orderData.idempotencyKey || orderData.paymentInfo || ""
  ).trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    const error = new Error("Provide a payment reference or Idempotency-Key for safe retries");
    error.statusCode = 400;
    throw error;
  }

  const quantities = new Map();
  for (const item of orderItems) {
    if (
      !item.product ||
      !mongoose.Types.ObjectId.isValid(item.product) ||
      !Number.isInteger(Number(item.quantity)) ||
      Number(item.quantity) < 1
    ) {
      const error = new Error("Each order item requires a valid product ID and positive integer quantity");
      error.statusCode = 400;
      throw error;
    }
    const productId = item.product.toString();
    quantities.set(productId, (quantities.get(productId) || 0) + Number(item.quantity));
  }

  const existing = await orderModel.findOne({ user, idempotencyKey });
  if (existing) return { order: existing, created: false };

  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const retry = await orderModel.findOne({ user, idempotencyKey }).session(session);
      if (retry) {
        order = retry;
        return;
      }

      const products = new Map();
      for (const [productId, quantity] of quantities) {
        const product = await productModel.findOne({
          _id: productId,
          $or: [
            { publicationStatus: "published" },
            { publicationStatus: { $exists: false } },
          ],
        }).session(session);
        if (product?.listingType === "rent") {
          const error = new Error(`Rental enquiries cannot be placed as orders: ${product.name}`);
          error.statusCode = 409;
          error.details = { productId, productName: product.name };
          throw error;
        }
        if (!product) {
          const error = new Error(`Product is unavailable for ordering: ${productId}`);
          error.statusCode = 409;
          error.details = { productId, requested: quantity, available: 0 };
          throw error;
        }
        const available = product.stock;
        if (available < quantity) {
          const error = new Error(`Insufficient stock for ${product?.name || productId}`);
          error.statusCode = 409;
          error.details = {
            productId,
            productName: product?.name || null,
            requested: quantity,
            available,
          };
          throw error;
        }
        products.set(productId, product);
      }

      const savedItems = [];
      let totalAmount = 0;
      for (const [productId, quantity] of quantities) {
        const product = products.get(productId);
        const result = await productModel.updateOne(
          { _id: product._id, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { session }
        );
        if (result.modifiedCount !== 1) {
          const error = new Error(`Insufficient stock for ${product.name}`);
          error.statusCode = 409;
          error.details = {
            productId,
            productName: product.name,
            requested: quantity,
            available: Math.max(0, product.stock),
          };
          throw error;
        }
        totalAmount += product.price * quantity;
        savedItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.images[0]?.url || undefined,
        });
      }

      [order] = await orderModel.create([{
        user,
        shippingInfo,
        orderItems: savedItems,
        paymentMethod,
        paymentInfo,
        idempotencyKey,
        itemPrice: totalAmount,
        totalAmount,
        inventoryDeducted: true,
      }], { session });
      await recordPurchasedProductInterests([...products.values()], user, session);
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = await orderModel.findOne({ user, idempotencyKey });
      if (duplicate) return { order: duplicate, created: false };
    }
    throw error;
  } finally {
    await session.endSession();
  }

  const notifications = [
    ["customer order email", () => sendReceiptEmail(order)],
    ["admin order email", () => sendAdminOrderEmail(order)],
    ["admin order SMS", () => sendNotificationToAdmin(order)],
  ];
  const results = await Promise.allSettled(notifications.map(([, send]) => send()));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`${notifications[index][0]} delivery failed:`, result.reason.message);
    }
  });
  return { order, created: true };
};
