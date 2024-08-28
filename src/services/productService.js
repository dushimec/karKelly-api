import mongoose from 'mongoose'; 
import productModel from "../models/productModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";
import { getCategoryByName } from "./categoryService.js";

export const getAllProducts = async (filter, sortBy = 'name') => {
  try {
    let sortOption = {};

  
    if (sortBy === 'newest') {
      sortOption = { createdAt: -1 }; 
    } else {
      sortOption = { name: 1 }; 
    }

    const products = await productModel.find(filter).populate('category').sort(sortOption);
    return products;
  } catch (error) {
    throw new Error('Error fetching products: ' + error.message);
  }
};




 

export const getSingleProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID");
  }
  return await productModel.findById(id).populate("category");

};

export const createProduct = async (productData, file) => {
  const { name, description, price, category, stock } = productData;

  if (!file) {
    throw new Error("Please provide a product image");
  }

  const dataUri = getDataUri(file);
  const cdb = await cloudinary.v2.uploader.upload(dataUri.content);
  const image = {
    public_id: cdb.public_id,
    url: cdb.secure_url,
  };

  return await productModel.create({
    name,
    description,
    price,
    category,
    stock,
    images: [image],
  });
};

export const updateProduct = async (id, productData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID");
  }

  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  const { name, description, price, stock, category } = productData;
  if (name) product.name = name;
  if (description) product.description = description;
  if (price) product.price = price;
  if (stock) product.stock = stock;
  if (category) product.category = category;

  await product.save();
  return product;
};

export const updateProductImage = async (id, file) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID");
  }

  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  if (!file) {
    throw new Error("Product image not found");
  }

  const dataUri = getDataUri(file);
  const cdb = await cloudinary.v2.uploader.upload(dataUri.content);
  const image = {
    public_id: cdb.public_id,
    url: cdb.secure_url,
  };

  product.images.push(image);
  await product.save();
  return product;
};

export const deleteProductImage = async (id, imageId) => {
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(imageId)) {
    throw new Error("Invalid Product ID or Image ID");
  }

  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  const imageIndex = product.images.findIndex(img => img._id.toString() === imageId.toString());

  if (imageIndex === -1) {
    throw new Error("Image not found");
  }

  await cloudinary.v2.uploader.destroy(product.images[imageIndex].public_id);
  product.images.splice(imageIndex, 1);
  await product.save();
  return product;
};

export const deleteProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid Product ID");
  }

  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  for (const image of product.images) {
    await cloudinary.v2.uploader.destroy(image.public_id);
  }

  await product.deleteOne();
  return product;
};

export const addProductReview = async (productId, reviewData, user) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid Product ID");
  }

  const { comment, rating } = reviewData;
  const product = await productModel.findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const alreadyReviewed = product.reviews.some(
    (r) => r.user.toString() === user._id.toString()
  );
  if (alreadyReviewed) {
    throw new Error("Product already reviewed");
  }
  
  const review = {
    name: user.name,
    rating: Number(rating),
    comment,
    user: user._id,
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) /
    product.reviews.length;

  await product.save();
  return product;
};

export const getProductsByCategoryName = async (categoryName) => {
  try {
    const category = await getCategoryByName(categoryName);

    if (!category) {
      throw new Error('Category not found');
    }
    return await productModel.find({ category: category._id }).populate('category');
  } catch (error) {
    throw new Error('Error fetching products by category name: ' + error.message);
  }
};
export const getTopProducts = async () => {
  try {
    const products = await productModel.find().sort({ rating: -1 }).limit(3).populate('category');
    return products;
  } catch (error) {
    throw new Error('Error fetching top products: ' + error.message);
  }
};
