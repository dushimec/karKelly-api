import { Order } from '../models/order';
import { OrderItem } from '../models/order-item';
import { Cart } from '../models/cart';

export const getAllOrders = async () => {
    const orderList = await Order.find().populate('user', 'name').sort({ 'dateOrdered': -1 });
    return orderList;
}

export const getOrderById = async (id) => {
    const order = await Order.findById(id)
        .populate('user', 'name')
        .populate({ 
            path: 'orderItems', populate: {
                path : 'product', populate: 'category'
            }
        });
    return order;
}

export const createOrderFromCart = async (userId, orderData) => {
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) throw new Error('Cart is empty');

    const orderItemsIds = await Promise.all(cart.items.map(async (item) => {
        let newOrderItem = new OrderItem({
            quantity: item.quantity,
            product: item.product._id
        });
        newOrderItem = await newOrderItem.save();
        return newOrderItem._id;
    }));

    const totalPrices = cart.items.map(item => item.product.price * item.quantity);
    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

    let order = new Order({
        orderItems: orderItemsIds,
        city: orderData.city,
        phone: orderData.phone,
        status: orderData.status,
        totalPrice: totalPrice,
        user: userId,
    });

    order = await order.save();
    await Cart.findOneAndRemove({ user: userId });

    return order;
}

export const updateOrder = async (id, data) => {
    const order = await Order.findByIdAndUpdate(
        id,
        { status: data.status },
        { new: true }
    );
    return order;
}

export const deleteOrder = async (id) => {
    const order = await Order.findByIdAndRemove(id);
    if (order) {
        await Promise.all(order.orderItems.map(async (orderItem) => {
            await OrderItem.findByIdAndRemove(orderItem);
        }));
    }
    return order;
}

export const getTotalSales = async () => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } }
    ]);
    return totalSales.pop().totalsales;
}

export const getOrderCount = async () => {
    const orderCount = await Order.countDocuments();
    return orderCount;
}

export const getUserOrders = async (userId) => {
    const userOrderList = await Order.find({ user: userId })
        .populate({ 
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        })
        .sort({ 'dateOrdered': -1 });
    return userOrderList;
}
