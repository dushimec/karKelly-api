import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";

export const createCategory = async (category) => {
  if (!category) {
    throw new Error("Please provide category name");
  }
  return await categoryModel.create({ category });
};

export const getCategoryByName = async (categoryName) => {
  try {
    const category = await categoryModel.findOne({ category: categoryName });
    return category;
  } catch (error) {
    throw new Error('Error fetching category: ' + error.message);
  }
};

export const getAllCategories = async () => {
  return await categoryModel.find({});
};

export const deleteCategory = async (id) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    throw new Error("Category not found");
  }

  const products = await productModel.find({ category: category._id });
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    product.category = undefined;
    await product.save();
  }

  await category.deleteOne();
  return category;
};

export const updateCategory = async (id, updatedCategory) => {
  const category = await categoryModel.findById(id);
  if (!category) {
    throw new Error("Category not found");
  }

  const products = await productModel.find({ category: category._id });
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    product.category = updatedCategory;
    await product.save();
  }

  if (updatedCategory) category.category = updatedCategory;
  await category.save();
  return category;
};

