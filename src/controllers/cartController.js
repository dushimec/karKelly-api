import * as cartService from '../services/cartSevice';

export const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const cart = await cartService.addToCart(req.user.id, productId, quantity);
        res.send(cart);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getCart = async (req, res) => {
    try {
        const cart = await cartService.getCart(req.user.id);
        res.send(cart);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const clearCart = async (req, res) => {
    try {
        await cartService.clearCart(req.user.id);
        res.send({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
