import express from 'express';
import * as cartController from '../controllers/cartController';


const cartRoutes = express.Router();

cartRoutes.post('/add',  cartController.addToCart);
cartRoutes.get('/', cartController.getCart);
cartRoutes.delete('/clear', cartController.clearCart);

export default cartRoutes;
