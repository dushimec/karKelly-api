import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { client } from "../config/twilio.js";
import cron from 'node-cron';
import "dotenv/config";
import { sendReceiptEmail } from "./emailService.js";

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
const updateProductStock = async (orderItems, increment = false) => {
  for (const item of orderItems) {
    const product = await productModel.findById(item.product);
    if (product) {
      product.stock += increment ? item.quantity : -item.quantity;
      await product.save();
    }
  }
};

/**
 * Update the status of an order.
 * @param {String} orderId - ID of the order to update.
 * @param {String} status - New status to set for the order.
 * @returns {Promise<Object>} The updated order.
 */
export const updateOrderStatus = async (orderId, status) => {
  try {
    // Validate status if necessary
    const validStatuses = ["processing", "shipped", "delivered", "canceled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status provided");
    }

    // Find the order to be updated
    const order = await orderModel.findById(orderId)
      .populate("orderItems.product", "name stock"); // Populate product details for stock update

    if (!order) {
      throw new Error("Order not found");
    }

    // Update the order status
    order.orderStatus = status;
    const updatedOrder = await order.save();

    // If the status is 'canceled', update the product stock
    if (status === "canceled") {
      await updateProductStock(order.orderItems, true); // Increment stock by adding quantities
    }

    return updatedOrder;
  } catch (error) {
    console.error("Error updating order status:", error.message);
    throw new Error("Failed to update order status");
  }
};

/**
 * Send SMS notification to admin.
 * @param {Object} order - The order for which notification is to be sent.
 */
const sendNotificationToAdmin = async (order) => {
  await order
    .populate("user", "name")
    .populate("orderItems.product", "name")
    .execPopulate();
  const productName = order.orderItems
    .map((item) => item.product.name)
    .join(", ");
  const message = {
    body: `KARY KELLY RWANDA, Muraho MUSENGIMANA Anysie. Order yatanzwe: Izina ry'igicuruzwa: ${productName} Yatanzwe na ${order.user.name}`,
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


/**
 * Cancel old processing orders.
 */
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

// Schedule a cron job to cancel old processing orders daily at midnight
cron.schedule("0 0 * * *", () => {
  console.log("Running scheduled task to cancel old processing orders...");
  cancelOldProcessingOrders();
});

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
    sendReceiptEmail(order), 
  ]);

  return order;
};
