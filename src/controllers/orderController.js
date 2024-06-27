import * as orderService from '../services/orderSevice';

export const getAllOrders = async (req, res) => {
    try {
        const orderList = await orderService.getAllOrders();
        if (!orderList) {
            return res.status(500).json({ success: false });
        }
        res.send(orderList);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const getOrderById = async (req, res) => {
    try {
        const order = await orderService.getOrderById(req.params.id);
        if (!order) {
            return res.status(500).json({ success: false });
        }
        res.send(order);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const createOrderFromCart = async (req, res) => {
    try {
        const order = await orderService.createOrderFromCart(req.user.id, req.body);
        res.send(order);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateOrder = async (req, res) => {
    try {
        const order = await orderService.updateOrder(req.params.id, req.body);
        if (!order) {
            return res.status(400).send('The order cannot be updated!');
        }
        res.send(order);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const deleteOrder = async (req, res) => {
    try {
        const order = await orderService.deleteOrder(req.params.id);
        if (order) {
            return res.status(200).json({ success: true, message: 'The order is deleted!' });
        } else {
            return res.status(404).json({ success: false, message: 'Order not found!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const getTotalSales = async (req, res) => {
    try {
        const totalSales = await orderService.getTotalSales();
        if (!totalSales) {
            return res.status(400).send('The order sales cannot be generated');
        }
        res.send({ totalsales: totalSales });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const getOrderCount = async (req, res) => {
    try {
        const orderCount = await orderService.getOrderCount();
        if (!orderCount) {
            return res.status(500).json({ success: false });
        }
        res.send({ orderCount });
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}

export const getUserOrders = async (req, res) => {
    try {
        const userOrderList = await orderService.getUserOrders(req.params.userid);
        if (!userOrderList) {
            return res.status(500).json({ success: false });
        }
        res.send(userOrderList);
    } catch (error) {
        res.status(500).json({ success: false, error });
    }
}
