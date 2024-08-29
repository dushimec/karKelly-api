import { sendProductCreationEmail } from '../services/emailService.js';
import * as productService from '../services/productService.js';

export const getAllProductsController = async (req, res) => {
  try {
    const { category, sortBy } = req.query;
    let products;

    if (category) {
      products = await productService.getProductsByCategoryName(category);
    } else {
      products = await productService.getAllProducts({}, sortBy);
    }

    res.status(200).send({
      success: true,
      message: 'All products fetched successfully',
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: 'Error in fetching products',
      error: error.message,
    });
  }
};


export const getTopProductsController = async (req, res) => {
  try {
    const products = await productService.getTopProducts();
    res.status(200).send({
      success: true,
      message: "Top 3 products",
      products,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error In Get TOP PRODUCTS API",
      error,
    });
  }
};

export const getSingleProductController = async (req, res) => {
  try {
    const product = await productService.getSingleProduct(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }
    res.status(200).send({
      success: true,
      message: "Product Found",
      product,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Get single Products API",
    });
  }
};

export const createProductController = async (req, res) => {
  try {
    const productData = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).send({
        success: false,
        message: "No image file provided",
      });
    }

    const createdProduct = await productService.createProduct(productData, file);
    res.status(201).send({
      success: true,
      message: "Product created successfully",
    });
   
    const productName = createdProduct.name;

    await sendProductCreationEmail(productName);


  } catch (error) {
    console.error('Error in createProductController:', error);

    if (error.http_code === 400 && error.message.includes('Stale request')) {
      res.status(400).send({
        success: false,
        message: "Time synchronization issue. Please ensure your server time is correct.",
      });
    } else {
      res.status(500).send({
        success: false,
        message: error.message || "Error In Create Product API",
      });
    }
  }
};

export const updateProductController = async (req, res) => {
  try {
    await productService.updateProduct(req.params.id, req.body);
    res.status(200).send({
      success: true,
      message: "Product details updated",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Update Product API",
    });
  }
};

export const updateProductImageController = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).send({
        success: false,
        message: "No image file provided",
      });
    }

    await productService.updateProductImage(req.params.id, file);
    res.status(200).send({
      success: true,
      message: "Product image updated",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Update Product Image API",
    });
  }
};

export const deleteProductImageController = async (req, res) => {
  try {
    const { id: imageId } = req.query;
    await productService.deleteProductImage(req.params.id, imageId);
    res.status(200).send({
      success: true,
      message: "Product image deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Delete Product Image API",
    });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Delete Product API",
    });
  }
};

export const productReviewController = async (req, res) => {
  try {
    await productService.addProductReview(req.params.id, req.body, req.user);
    res.status(200).send({
      success: true,
      message: "Review added",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error In Review API",
    });
  }
};

export const cancelOrderController = async (req, res) => {
  try {
    const { orderId } = req.params;

    await productService.updateProductStock(orderId);

    res.status(200).send({
      success: true,
      message: "Order canceled and product stock updated",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Error canceling order",
    });
  }
};