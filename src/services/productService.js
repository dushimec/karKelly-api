import productModel from "../models/productModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";
import { getCategoryByName } from "./categoryService.js";

export const getAllProducts = async (filter) => {
  try {
    const products = await productModel.find(filter).populate('category');
    return products;
  } catch (error) {
    throw new Error('Error fetching products: ' + error.message);
  }
};

export const getTopProducts = async () => {
  return await productModel.find({}).sort({ rating: -1 }).limit(3);
};

export const getSingleProduct = async (id) => {
  return await productModel.findById(id).populate("category");
};

export const createProduct = async (productData, file) => {
  const { name, description, price, category, stock } = productData;

  if (!file) {
    throw new Error("Please provide product images");
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
  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  let isExist = -1;
  product.images.forEach((item, index) => {
    if (item._id.toString() === imageId.toString()) isExist = index;
  });

  if (isExist < 0) {
    throw new Error("Image not found");
  }

  await cloudinary.v2.uploader.destroy(product.images[isExist].public_id);
  product.images.splice(isExist, 1);
  await product.save();
  return product;
};

export const deleteProduct = async (id) => {
  const product = await productModel.findById(id);

  if (!product) {
    throw new Error("Product not found");
  }

  for (let index = 0; index < product.images.length; index++) {
    await cloudinary.v2.uploader.destroy(product.images[index].public_id);
  }
  
  await product.deleteOne();
  return product;
};

export const addProductReview = async (productId, reviewData, user) => {
  const { comment, rating } = reviewData;
  const product = await productModel.findById(productId);

  const alreadyReviewed = product.reviews.find(
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
    const products = await productModel.find({ category: category._id }).populate('category');
    return products;
  } catch (error) {
    throw new Error('Error fetching products by category name: ' + error.message);
  }
};