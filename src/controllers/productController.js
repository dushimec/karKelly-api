import * as productService from '../services/productService';

export const getAllProducts = async (req, res) => {
    try {
        let filter = {};
        if (req.query.categories) {
            filter = { category: req.query.categories.split(',') };
        }
        const productList = await productService.getAllProducts(filter);
        if (!productList) {
            return res.status(500).json({ success: false });
        }
        res.send(productList);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
            return res.status(500).json({ success: false });
        }
        res.send(product);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const createProduct = async (req, res) => {
    try {
        const product = await productService.createProduct(req.body, req.file);
        res.send(product);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body);
        if (!product) {
            return res.status(500).send('The product cannot be updated!');
        }
        res.send(product);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await productService.deleteProduct(req.params.id);
        if (product) {
            return res.status(200).json({ success: true, message: 'The product is deleted!' });
        } else {
            return res.status(404).json({ success: false, message: 'Product not found!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getProductCount = async (req, res) => {
    try {
        const productCount = await productService.getProductCount();
        if (!productCount) {
            return res.status(500).json({ success: false });
        }
        res.send({ productCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getFeaturedProducts = async (req, res) => {
    try {
        const count = req.params.count ? req.params.count : 0;
        const products = await productService.getFeaturedProducts(count);
        if (!products) {
            return res.status(500).json({ success: false });
        }
        res.send(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const updateProductGallery = async (req, res) => {
    try {
        const product = await productService.updateProductGallery(
            req.params.id, 
            req.files, 
            req.protocol, 
            req.get('host')
        );
        if (!product) {
            return res.status(500).send('The gallery cannot be updated!');
        }
        res.send(product);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
