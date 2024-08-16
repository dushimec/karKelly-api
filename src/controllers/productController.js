import { getCategoryByName } from '../services/categoryService.js';
import * as productService from '../services/productService.js';

// Add logging in controller
export const getAllProductsController = async (req, res) => {
  try {
    const { category } = req.query;
    console.log('Category:', category); 
    let products;

    if (category) {
      products = await productService.getProductsByCategoryName(category);
    } else {
      products = await productService.getAllProducts({});
    }

    res.status(200).send({
      success: true,
      message: 'All products fetched successfully',
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.error(error);
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
    console.log(error);
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
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Get single Products API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const createProductController = async (req, res) => {
  try {
    const productData = req.body;
    const file = req.file;
    await productService.createProduct(productData, file);
    res.status(201).send({
      success: true,
      message: "Product created successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Create Product API",
      error,
    });
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
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Update Product API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

export const updateProductImageController = async (req, res) => {
  try {
    await productService.updateProductImage(req.params.id, req.file);
    res.status(200).send({
      success: true,
      message: "Product image updated",
    });
  } catch (error) {
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Update Product Image API";
    res.status(500).send({
      success: false,
      message: errorMessage,
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
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Delete Product Image API";
    res.status(500).send({
      success: false,
      message: errorMessage,
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
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Delete Product API";
    res.status(500).send({
      success: false,
      message: errorMessage,
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
    console.log(error);
    const errorMessage = error.name === "CastError" ? "Invalid Id" : error.message || "Error In Review API";
    res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};
