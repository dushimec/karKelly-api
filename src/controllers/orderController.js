import * as orderService from '../services/orderService.js';

export const createOrderController = async (req, res) => {
  try {
    const orderData = { ...req.body, user: req.user._id };
    await orderService.createOrder(orderData);
    res.status(201).send({
      success: true,
      message: req.t("order_placed")
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Create Order API",
      error,
    });
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
      message: ("orders_fetched"),
      totalOrder: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In My Orders API",
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
      message: req.t("order_fetched"),
      order,
    });
  } catch (error) {
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Get Order Details API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const paymentsController = async (req, res) => {
  try {
    const { totalAmount } = req.body;
    const paymentData = await orderService.processPayment(totalAmount);
    res.status(200).send({
      success: true,
      message: req.t("payment_processed"),
      data: paymentData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || 'Error processing payment',
      error,
    });
  }
};

export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.status(200).send({
      success: true,
      message: "All Orders Data",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get All Orders API",
      error,
    });
  }
};

export const changeOrderStatusController = async (req, res) => {
  try {
    await orderService.changeOrderStatus(req.params.id);
    res.status(200).send({
      success: true,
      message: req.t("order_status_updated"),
    });
  } catch (error) {
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Change Order Status API";
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
    const limit = parseInt(req.query.limit, 10) || 5; 
    const recentOrders = await orderService.getRecentOrders(limit);
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