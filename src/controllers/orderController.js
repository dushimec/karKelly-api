import * as orderService from '../services/orderService.js';

export const createOrderController = async (req, res) => {
  try {
    const orderData = { ...req.body, user: req.user._id };
    await orderService.createOrder(orderData);
    res.status(201).send({
      success: true,
      message: "Order Placed Successfully",
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
      message: "Your orders data",
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
      message: "Your order fetched",
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
      message: 'Payment request accepted',
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
      message: "Order status updated",
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
