import * as orderService from "../services/orderService.js";

export const createOrderController = async (req, res) => {
  try {
    const orderData = { ...req.body, user: req.user._id };
    const order = await orderService.createOrder(orderData);

    // Send response only after all operations are completed
    res.status(201).send({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    // Ensure response is sent only once
    if (!res.headersSent) {
      res.status(500).send({
        success: false,
        message: error.message || "Error in Create Order API",
        error,
      });
    }
  }
};

export const getMyOrdersController = async (req, res) => {
  try {
    const orders = await orderService.getMyOrders(req.user._id);
    if (!orders.length) {
      return res.status(404).send({
        success: false,
        message: "No orders found",
      });
    }
    res.status(200).send({
      success: true,
      message: "Orders fetched successfully",
      totalOrder: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in My Orders API",
      error,
    });
  }
};

export const singleOrderDetailsController = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "No order found",
      });
    }
    res.status(200).send({
      success: true,
      message: "Order fetched successfully",
      order,
    });
  } catch (error) {
    console.log(error);
    const errorMessage =
      error.name === "CastError"
        ? "Invalid Id"
        : error.message || "Error in Get Order Details API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.status(200).send({
      success: true,
      message: "All orders fetched successfully",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in Get All Orders API",
      error,
    });
  }
};

export const changeOrderStatusController = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.status(200).send({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.log(error);
    const errorMessage =
      error.name === "CastError"
        ? "Invalid Id"
        : error.message || "Error in Change Order Status API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const getTotalSalesController = async (req, res) => {
  try {
    const totalSales = await orderService.getTotalSales();
    res.status(200).send({
      success: true,
      message: "Total sales fetched successfully",
      totalSales,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error fetching total sales",
      error,
    });
  }
};

export const getTotalOrdersController = async (req, res) => {
  try {
    const totalOrders = await orderService.getTotalOrders();
    res.status(200).send({
      success: true,
      message: "Total orders fetched successfully",
      totalOrders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error fetching total orders",
      error,
    });
  }
};

export const getTotalCustomersController = async (req, res) => {
  try {
    const totalCustomers = await orderService.getTotalCustomers();
    res.status(200).send({
      success: true,
      message: "Total customers fetched successfully",
      totalCustomers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error fetching total customers",
      error,
    });
  }
};

export const getRecentOrdersController = async (req, res) => {
  try {
    const recentOrders = await orderService.getRecentOrders();
    res.status(200).send({
      success: true,
      message: "Recent orders fetched successfully",
      recentOrders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error fetching recent orders",
      error,
    });
  }
};
