import mongoose from "mongoose";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

const serviceInterestGroups = {
  stationery: "school-supplies",
  book: "school-supplies",
  hardware: "hardware",
  car: "cars",
  food: "food",
};

const categoryInterestGroups = {
  schoolmatetial: "school-supplies",
  hardware: "hardware",
  carservices: "cars",
  food: "food",
};

export const getProductInterestGroup = async (product, session) => {
  if (serviceInterestGroups[product.serviceType]) {
    return serviceInterestGroups[product.serviceType];
  }
  if (!product.category) return null;

  const categoryId = product.category._id || product.category;
  if (!mongoose.Types.ObjectId.isValid(categoryId)) return null;
  let categoryQuery = categoryModel.findById(categoryId);
  if (session) categoryQuery = categoryQuery.session(session);
  const category = await categoryQuery;
  return categoryInterestGroups[String(category?.category || "").trim().toLowerCase()] || null;
};

export const recordProductCartInterest = async (productId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("Invalid Product ID");
    error.statusCode = 400;
    throw error;
  }
  const product = await productModel.findOne({
    _id: productId,
    $or: [
      { publicationStatus: "published" },
      { publicationStatus: { $exists: false } },
    ],
  });
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  const interest = await getProductInterestGroup(product);
  if (!interest) {
    const error = new Error("Product category cannot be used for launch notifications");
    error.statusCode = 400;
    throw error;
  }
  const result = await userModel.updateOne(
    { _id: userId },
    { $addToSet: { productInterests: interest } }
  );
  if (result.matchedCount === 0 || result.n === 0) {
    const error = new Error("Customer account not found");
    error.statusCode = 404;
    throw error;
  }
  return interest;
};

export const recordPurchasedProductInterests = async (products, userId, session) => {
  const interests = new Set();
  for (const product of products) {
    const group = await getProductInterestGroup(product, session);
    if (group) interests.add(group);
  }
  if (interests.size === 0) return;

  await userModel.updateOne(
    { _id: userId },
    { $addToSet: { productInterests: { $each: [...interests] } } },
    { session }
  );
};
