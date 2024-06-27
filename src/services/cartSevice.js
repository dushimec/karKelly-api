import { Cart } from '../models/cart';
import { Product } from '../models/product';

export const addToCart = async (userId, productId, quantity) => {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
        cart = new Cart({
            user: userId,
            items: [{ product: productId, quantity }]
        });
    } else {
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }
    }

    return await cart.save();
};

export const getCart = async (userId) => {
    return await Cart.findOne({ user: userId }).populate('items.product');
};

export const clearCart = async (userId) => {
    return await Cart.findOneAndRemove({ user: userId });
};
