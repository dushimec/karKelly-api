import { sendProductLaunchEmails } from '../services/emailService.js';
import { recordProductCartInterest } from "../services/productInterestService.js";
import * as productService from '../services/productService.js';

const notifyProductLaunch = async (product) => {
  try {
    await sendProductLaunchEmails(product);
  } catch (error) {
    console.error("Product launch email delivery failed:", error.message);
  }
};

const productListOptions = (query) => {
  const currentPage = Number(query.page || 1);
  const pageLimit = Number(query.limit || 1000);
  if (
    !Number.isInteger(currentPage) ||
    currentPage < 1 ||
    !Number.isInteger(pageLimit) ||
    pageLimit < 1 ||
    pageLimit > 1000
  ) {
    const error = new Error("Invalid pagination values");
    error.statusCode = 400;
    throw error;
  }
  const options = {
    page: currentPage,
    limit: pageLimit,
    search: String(query.search || ""),
    fuelType: query.fuelType ? String(query.fuelType) : undefined,
    seats: query.seats === undefined ? undefined : Number(query.seats),
    minPrice: query.minPrice === undefined ? undefined : Number(query.minPrice),
    maxPrice: query.maxPrice === undefined ? undefined : Number(query.maxPrice),
  };
  for (const value of [options.seats, options.minPrice, options.maxPrice]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      const error = new Error("Invalid product filter value");
      error.statusCode = 400;
      throw error;
    }
  }
  return options;
};

export const getAllProductsController = async (req, res) => {
  try {
    const {
      category,
      sortBy,
    } = req.query;
    const options = productListOptions(req.query);

    let products;

    if (category) {
      products = await productService.getProductsByCategoryName(String(category), sortBy, options);
    } else {
      products = await productService.getAllProducts({}, sortBy, options);
    }

    if (!products || !products.docs) {
      return res.status(404).send({
        success: false,
        message: 'No products found',
      });
    }

    return res.status(200).send({
      success: true,
      message: 'All products fetched successfully',
      totalProducts: products.totalDocs,
      totalPages: products.totalPages,
      currentPage: products.page,
      products: products.docs,
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Error in fetching products",
    });
  }
};

export const getAdminProductsController = async (req, res) => {
  try {
    const products = await productService.getAdminProducts(
      req.query.sortBy,
      productListOptions(req.query)
    );
    return res.status(200).send({
      success: true,
      message: "Admin products fetched successfully",
      totalProducts: products.totalDocs,
      totalPages: products.totalPages,
      currentPage: products.page,
      products: products.docs,
    });
  } catch (error) {
    console.error("Error fetching admin products:", error.message);
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Error in fetching admin products",
    });
  }
};



export const getTopProductsController = async (req, res) => {
  try {
    const products = await productService.getTopProducts();
    return res.status(200).send({
      success: true,
      message: "Top 3 products",
      products,
    });
  } catch (error) {
    console.error("Error fetching top products:", error.message);
    res.status(error.statusCode || 500).send({
      success: false,
      message: "Error In Get TOP PRODUCTS API",
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
    return res.status(200).send({
      success: true,
      message: "Product Found",
      product,
    });
  } catch (error) {
    res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Error In Get single Products API",
    });
  }
};

export const getAdminProductController = async (req, res) => {
  try {
    const product = await productService.getSingleProduct(req.params.id, true);
    if (!product) {
      return res.status(404).send({ success: false, message: "Product not found" });
    }
    return res.status(200).send({ success: true, message: "Product Found", product });
  } catch (error) {
    console.error("Error fetching admin product:", error.message);
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Error fetching admin product",
    });
  }
};

export const getAdminCarListingController = async (req, res) => {
  try {
    const product = await productService.getSingleProduct(req.params.id, true);
    if (!product?.carDetails) {
      return res.status(404).send({ success: false, message: "Car listing not found" });
    }
    return res.status(200).send({ success: true, message: "Car listing fetched", product });
  } catch (error) {
    return res.status(error.statusCode || 400).send({ success: false, message: error.message });
  }
};

export const createProductController = async (req, res) => {
  try {
    const productData = req.body;
    const file = req.file;

    const createdProduct = await productService.createProduct(productData, file);
    await notifyProductLaunch(createdProduct);
    return res.status(201).send({
      success: true,
      message: "Product created successfully",
      product: createdProduct,
    });
  } catch (error) {
    console.error('Error in createProductController:', error);

    const statusCode = error.statusCode || (error.http_code === 400 ? 400 : 500);
    return res.status(statusCode).send({
      success: false,
      message: statusCode < 500 ? error.message : "Unable to create product",
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const createProductsBulkController = async (req, res) => {
  try {
    let products = req.body.products;
    if (typeof products === "string") products = JSON.parse(products);
    const createdProducts = await productService.createProductsBulk(products, req.files || []);
    await Promise.all(createdProducts.map((product) => notifyProductLaunch(product)));
    return res.status(201).send({
      success: true,
      message: "Products created successfully",
      totalProducts: createdProducts.length,
      products: createdProducts,
    });
  } catch (error) {
    return res.status(error.statusCode || (error instanceof SyntaxError ? 400 : 500)).send({
      success: false,
      message: error.message || "Error creating products",
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const createCarListingController = async (req, res) => {
  try {
    const product = await productService.createCarListing(req.body, req.files || []);
    return res.status(201).send({ success: true, message: "Car listing created as draft", product });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message,
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const updateCarListingController = async (req, res) => {
  try {
    const product = await productService.updateCarListing(req.params.id, req.body);
    return res.status(200).send({ success: true, message: "Car listing updated", product });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message,
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const setCarPublicationStatusController = async (req, res) => {
  try {
    const { publicationStatus } = req.body;
    const previous = await productService.getSingleProduct(req.params.id, true);
    const product = await productService.setCarPublicationStatus(req.params.id, publicationStatus);
    if (previous?.publicationStatus !== "published" && product.publicationStatus === "published") {
      await notifyProductLaunch(product);
    }
    return res.status(200).send({
      success: true,
      message: `Car listing ${publicationStatus}`,
      product,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message,
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const updateProductController = async (req, res) => {
  try {
    const previous = await productService.getSingleProduct(req.params.id, true);
    const product = await productService.updateProduct(req.params.id, req.body);
    if (previous?.publicationStatus !== "published" && product.publicationStatus === "published") {
      await notifyProductLaunch(product);
    }
    return res.status(200).send({
      success: true,
      message: "Product details updated",
      product,
    });
  } catch (error) {
    console.error("Error updating product:", error.message);
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Error In Update Product API",
      ...(error.errors && { errors: error.errors }),
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

    const product = await productService.updateProductImage(req.params.id, file, req.body);
    return res.status(200).send({
      success: true,
      message: "Product image updated",
      product,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message || "Error In Update Product Image API",
      ...(error.errors && { errors: error.errors }),
    });
  }
};

export const deleteProductImageController = async (req, res) => {
  try {
    const { id: imageId } = req.query;
    await productService.deleteProductImage(req.params.id, imageId);
    return res.status(200).send({
      success: true,
      message: "Product image deleted successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message || "Error In Delete Product Image API",
    });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    return res.status(200).send({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.message || "Error In Delete Product API",
    });
  }
};

export const recordProductCartInterestController = async (req, res) => {
  try {
    await recordProductCartInterest(req.params.id, req.user._id);
    return res.status(200).send({
      success: true,
      message: "Product category interest recorded",
    });
  } catch (error) {
    console.error("Error recording product cart interest:", error.message);
    return res.status(error.statusCode || 500).send({
      success: false,
      message: error.statusCode ? error.message : "Unable to record product category interest",
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

    await productService.restoreOrderStock(orderId);

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