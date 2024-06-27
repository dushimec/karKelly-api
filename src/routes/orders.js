import express from 'express';
import * as orderController from '../controllers/orderController';

const ordersRoutes = express.Router();

ordersRoutes.get('/', orderController.getAllOrders);
ordersRoutes.get('/:id', orderController.getOrderById);
ordersRoutes.post('/cart', orderController.createOrderFromCart);
ordersRoutes.put('/:id', orderController.updateOrder);
ordersRoutes.delete('/:id', orderController.deleteOrder);
ordersRoutes.get('/get/totalsales', orderController.getTotalSales);
ordersRoutes.get('/get/count', orderController.getOrderCount);
ordersRoutes.get('/get/userorders/:userid', orderController.getUserOrders);

export default ordersRoutes;
